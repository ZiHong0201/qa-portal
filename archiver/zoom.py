"""Zoom Server-to-Server OAuth client.

Polling rather than webhooks. A webhook needs a public HTTPS listener, which
means hosting; polling needs nothing and is self-healing, because a cycle that
fails is simply retried by the next one. The cost is up to a few minutes of
latency, which does not matter for an archival workflow.
"""

from __future__ import annotations

import base64
import logging
import time
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterator, Optional

import requests

from .models import ZoomRecording

log = logging.getLogger(__name__)

TOKEN_URL = "https://zoom.us/oauth/token"
API_BASE = "https://api.zoom.us/v2"
RETRY_STATUS = {429, 500, 502, 503, 504}
CHUNK = 1024 * 1024


class ZoomError(RuntimeError):
    pass


def encode_uuid(uuid: str) -> str:
    """URL-encode a meeting UUID for use in a path segment.

    Zoom UUIDs are base64 and can contain '/' or start with it. Those must be
    double-encoded or the API reads them as path separators and returns 404.
    UUIDs without those characters must NOT be double-encoded, so the rule is
    conditional rather than blanket.
    """
    if uuid.startswith("/") or "//" in uuid:
        return urllib.parse.quote(urllib.parse.quote(uuid, safe=""), safe="")
    return urllib.parse.quote(uuid, safe="")


class ZoomClient:
    def __init__(self, account_id: str, client_id: str, client_secret: str):
        self.account_id = account_id
        self.client_id = client_id
        self.client_secret = client_secret
        self._token: Optional[str] = None
        self._token_expires_at = 0.0
        self.session = requests.Session()

    # -- auth ---------------------------------------------------------------
    @property
    def token(self) -> str:
        # Refresh a minute early; Zoom tokens last an hour.
        if self._token and time.time() < self._token_expires_at - 60:
            return self._token

        basic = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()
        response = self.session.post(
            TOKEN_URL,
            params={
                "grant_type": "account_credentials",
                "account_id": self.account_id,
            },
            headers={"Authorization": f"Basic {basic}"},
            timeout=30,
        )
        if response.status_code != 200:
            raise ZoomError(
                f"Zoom token request failed ({response.status_code}): {response.text[:300]}"
            )
        payload = response.json()
        self._token = payload["access_token"]
        self._token_expires_at = time.time() + int(payload.get("expires_in", 3600))
        return self._token

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.token}"}

    def _request(self, method: str, path: str, **kwargs) -> requests.Response:
        url = path if path.startswith("http") else f"{API_BASE}{path}"
        backoff = 2.0
        last: Optional[requests.Response] = None
        for attempt in range(5):
            response = self.session.request(
                method, url, headers=self._headers(), timeout=60, **kwargs
            )
            if response.status_code not in RETRY_STATUS:
                return response
            last = response
            wait = float(response.headers.get("Retry-After", backoff))
            log.warning(
                "Zoom %s %s returned %s; retrying in %.0fs (attempt %d/5)",
                method, path, response.status_code, wait, attempt + 1,
            )
            time.sleep(wait)
            backoff *= 2
        return last if last is not None else response

    # -- recordings ---------------------------------------------------------
    def list_recordings(self, lookback_days: int = 3) -> list[ZoomRecording]:
        """List cloud recordings in the lookback window.

        Zoom caps a single from/to query at one month, so long windows are
        walked in monthly slices. The state store de-duplicates, which is why
        a generous lookback is safe and a missed poll cycle self-heals.
        """
        end = datetime.now(timezone.utc).date()
        start = end - timedelta(days=max(1, lookback_days))
        out: list[ZoomRecording] = []

        window_start = start
        while window_start <= end:
            window_end = min(window_start + timedelta(days=29), end)
            out.extend(self._list_window(window_start, window_end))
            window_start = window_end + timedelta(days=1)

        # De-duplicate across slices, newest first.
        unique: dict[str, ZoomRecording] = {}
        for rec in out:
            unique.setdefault(rec.uuid, rec)
        return sorted(unique.values(), key=lambda r: r.start, reverse=True)

    def _list_window(self, start, end) -> Iterator[ZoomRecording]:
        token = ""
        while True:
            params = {
                "from": start.isoformat(),
                "to": end.isoformat(),
                "page_size": 300,
            }
            if token:
                params["next_page_token"] = token
            response = self._request("GET", "/users/me/recordings", params=params)
            if response.status_code != 200:
                raise ZoomError(
                    f"Listing recordings failed ({response.status_code}): "
                    f"{response.text[:300]}"
                )
            payload = response.json()
            for meeting in payload.get("meetings", []):
                parsed = self._parse_meeting(meeting)
                if parsed:
                    yield parsed
            token = payload.get("next_page_token") or ""
            if not token:
                return

    @staticmethod
    def _parse_meeting(meeting: dict) -> Optional[ZoomRecording]:
        """Pull the three files we care about out of a meeting's file list.

        Zoom emits several artefacts per session (gallery view, chat, timeline).
        Only the speaker-view MP4, the audio-only M4A and the VTT transcript
        matter; everything else is ignored rather than downloaded.
        """
        start_raw = meeting.get("start_time")
        if not start_raw:
            return None
        start = datetime.fromisoformat(start_raw.replace("Z", "+00:00"))

        video = audio = transcript = None
        for entry in meeting.get("recording_files", []):
            if entry.get("status") not in (None, "completed"):
                continue
            file_type = (entry.get("file_type") or "").upper()
            rec_type = (entry.get("recording_type") or "").lower()
            if file_type == "MP4" and video is None:
                video = entry
            elif file_type == "M4A" or rec_type == "audio_only":
                audio = audio or entry
            elif file_type in {"TRANSCRIPT", "VTT"} or rec_type == "audio_transcript":
                transcript = transcript or entry

        if video is None and audio is None:
            return None

        return ZoomRecording(
            uuid=meeting["uuid"],
            meeting_id=str(meeting.get("id", "")),
            topic=meeting.get("topic", "") or "",
            start=start,
            duration_minutes=int(meeting.get("duration", 0) or 0),
            video_file_id=(video or {}).get("id"),
            video_url=(video or {}).get("download_url"),
            video_bytes=int((video or {}).get("file_size", 0) or 0),
            audio_file_id=(audio or {}).get("id"),
            audio_url=(audio or {}).get("download_url"),
            audio_bytes=int((audio or {}).get("file_size", 0) or 0),
            transcript_url=(transcript or {}).get("download_url"),
            download_token=meeting.get("download_token"),
        )

    # -- transfer -----------------------------------------------------------
    def download(self, url: str, dest: Path, download_token: Optional[str] = None) -> int:
        """Stream a recording file to disk, returning the byte count.

        Zoom's download endpoints are inconsistent about which credential they
        accept: a Bearer header works for most Server-to-Server apps, but some
        accounts only accept the token as a query parameter. Rather than pick
        one and fail opaquely for half of setups, try the header and fall back.
        """
        dest.parent.mkdir(parents=True, exist_ok=True)
        attempts = [
            {"headers": {"Authorization": f"Bearer {download_token or self.token}"}},
            {"params": {"access_token": download_token or self.token}},
        ]
        last_error = ""
        for attempt in attempts:
            try:
                with self.session.get(
                    url, stream=True, timeout=(30, 600), allow_redirects=True, **attempt
                ) as response:
                    if response.status_code != 200:
                        last_error = f"{response.status_code}: {response.text[:200]}"
                        continue
                    written = 0
                    tmp = dest.with_suffix(dest.suffix + ".part")
                    with open(tmp, "wb") as handle:
                        for chunk in response.iter_content(chunk_size=CHUNK):
                            if chunk:
                                handle.write(chunk)
                                written += len(chunk)
                    tmp.replace(dest)
                    return written
            except requests.RequestException as exc:
                last_error = str(exc)
        raise ZoomError(f"Download failed for {dest.name}: {last_error}")

    def delete_recording(self, uuid: str, action: str = "trash") -> None:
        """Remove a meeting's recordings from Zoom cloud storage.

        'trash' is recoverable from Zoom's trash for 30 days and is the default
        precisely because this runs unattended.
        """
        response = self._request(
            "DELETE",
            f"/meetings/{encode_uuid(uuid)}/recordings",
            params={"action": action},
        )
        # 404 means it is already gone, which is the desired end state anyway.
        if response.status_code not in (200, 204, 404):
            raise ZoomError(
                f"Deleting recording failed ({response.status_code}): "
                f"{response.text[:300]}"
            )

    def storage_used_bytes(self, lookback_days: int = 120) -> int:
        """Approximate Zoom cloud storage in use.

        Summing the listed recordings' sizes rather than calling a reporting
        endpoint keeps the app's OAuth scopes minimal. It is a lower bound, so
        the storage warning it drives errs towards firing early.
        """
        total = 0
        for rec in self.list_recordings(lookback_days=lookback_days):
            total += rec.video_bytes + rec.audio_bytes
        return total
