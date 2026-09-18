"""Google Drive archival.

One non-obvious constraint shapes this module: a Google service account has no
My Drive storage quota of its own, so the natural instinct for unattended
automation - a service account key - fails with an opaque quota error. This
uses an installed-app OAuth flow instead, authorising once against your own
account and caching the refresh token locally.

The default scope is `drive.file`, which grants access only to files this app
itself creates. That is genuine least privilege: the archiver can build and
fill its own tree but cannot read the rest of your Drive.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

log = logging.getLogger(__name__)

SCOPES = {
    "drive.file": ["https://www.googleapis.com/auth/drive.file"],
    "drive": ["https://www.googleapis.com/auth/drive"],
}
FOLDER_MIME = "application/vnd.google-apps.folder"
CREDENTIALS_DIR = Path(__file__).resolve().parents[1] / "credentials"
CLIENT_SECRETS = CREDENTIALS_DIR / "google-oauth-client.json"
TOKEN_FILE = CREDENTIALS_DIR / "drive-token.json"


class DriveError(RuntimeError):
    pass


class DriveClient:
    def __init__(self, scope_name: str = "drive.file"):
        self.scopes = SCOPES.get(scope_name, SCOPES["drive.file"])
        self._service = None
        self._folder_cache: dict[tuple[str, str], str] = {}

    # -- auth ---------------------------------------------------------------
    def authorise(self, interactive: bool = True):
        """Return an authorised Drive service, running the consent flow if needed."""
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build

        creds: Optional[Credentials] = None
        if TOKEN_FILE.exists():
            creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), self.scopes)

        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as exc:
                log.warning("Drive token refresh failed (%s); re-authorising", exc)
                creds = None

        if not creds or not creds.valid:
            if not interactive:
                raise DriveError(
                    "Google Drive is not authorised yet. Run:  "
                    "python -m archiver.cli auth-drive"
                )
            if not CLIENT_SECRETS.exists():
                raise DriveError(
                    f"Missing {CLIENT_SECRETS}. Create an OAuth client ID of type "
                    "'Desktop app' in Google Cloud Console, download the JSON, and "
                    "save it there. See the README."
                )
            flow = InstalledAppFlow.from_client_secrets_file(
                str(CLIENT_SECRETS), self.scopes
            )
            creds = flow.run_local_server(port=0)
            CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)
            TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")
            TOKEN_FILE.chmod(0o600)

        self._service = build("drive", "v3", credentials=creds, cache_discovery=False)
        return self._service

    @property
    def service(self):
        if self._service is None:
            self.authorise(interactive=False)
        return self._service

    # -- folders ------------------------------------------------------------
    def ensure_folder(self, name: str, parent_id: Optional[str] = None) -> str:
        """Find or create one folder, memoised per (parent, name)."""
        key = (parent_id or "root", name)
        if key in self._folder_cache:
            return self._folder_cache[key]

        safe_name = name.replace("'", "\\'")
        query = (
            f"name = '{safe_name}' and mimeType = '{FOLDER_MIME}' and trashed = false"
        )
        if parent_id:
            query += f" and '{parent_id}' in parents"

        result = (
            self.service.files()
            .list(q=query, spaces="drive", fields="files(id, name)", pageSize=10)
            .execute()
        )
        files = result.get("files", [])
        if files:
            folder_id = files[0]["id"]
        else:
            metadata = {"name": name, "mimeType": FOLDER_MIME}
            if parent_id:
                metadata["parents"] = [parent_id]
            folder_id = (
                self.service.files().create(body=metadata, fields="id").execute()["id"]
            )
            log.info("Created Drive folder: %s", name)

        self._folder_cache[key] = folder_id
        return folder_id

    def ensure_path(self, segments: list[str], root_id: Optional[str] = None) -> str:
        """Walk or build a nested folder path, returning the deepest folder id."""
        parent = root_id
        for segment in segments:
            parent = self.ensure_folder(segment, parent)
        if parent is None:
            raise DriveError("Empty Drive path")
        return parent

    # -- files --------------------------------------------------------------
    def find_file(self, name: str, parent_id: str) -> Optional[dict]:
        safe_name = name.replace("'", "\\'")
        result = (
            self.service.files()
            .list(
                q=f"name = '{safe_name}' and '{parent_id}' in parents and trashed = false",
                spaces="drive",
                fields="files(id, name, size)",
                pageSize=10,
            )
            .execute()
        )
        files = result.get("files", [])
        return files[0] if files else None

    def upload(
        self,
        local_path: Path,
        name: str,
        parent_id: str,
        mime_type: str = "video/mp4",
    ) -> dict:
        """Resumable upload, skipping work if an identical file is already there.

        The size check makes the whole pipeline safely re-runnable: a crash
        after upload but before the Zoom deletion replays without transferring
        the file a second time.
        """
        from googleapiclient.http import MediaFileUpload

        local_size = local_path.stat().st_size
        existing = self.find_file(name, parent_id)
        if existing and int(existing.get("size") or 0) == local_size:
            log.info("Already in Drive at the right size, skipping upload: %s", name)
            return {"id": existing["id"], "size": str(local_size), "reused": True}

        media = MediaFileUpload(
            str(local_path), mimetype=mime_type, resumable=True, chunksize=8 * 1024 * 1024
        )
        request = self.service.files().create(
            body={"name": name, "parents": [parent_id]},
            media_body=media,
            fields="id, name, size",
        )

        response = None
        while response is None:
            status, response = request.next_chunk()
            if status:
                log.info("  uploading %s: %d%%", name, int(status.progress() * 100))
        return response

    def verify(self, file_id: str, expected_bytes: int) -> bool:
        """Confirm Drive holds the whole file before anything is deleted."""
        meta = self.service.files().get(fileId=file_id, fields="size").execute()
        actual = int(meta.get("size") or 0)
        if actual != expected_bytes:
            log.error(
                "Drive size mismatch for %s: expected %d, got %d",
                file_id, expected_bytes, actual,
            )
            return False
        return True

    def delete_file(self, file_id: str) -> None:
        self.service.files().delete(fileId=file_id).execute()
