"""Pipeline orchestration.

Each recording walks an ordered set of stages recorded in SQLite, so a crash
or a lost network connection resumes at the last completed stage rather than
starting over. The ordering of the last three stages is deliberate and is the
single most important safety property here: upload, then verify the byte
count, and only then remove anything from Zoom.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from .calendar_src import CalendarReader
from .classify import classify
from .config import Config, require_env
from .drive import DriveClient
from .fusion import decide
from .matching import match_recording
from .models import Route, ZoomRecording
from .naming import build_filename, build_folder_path
from .notify import Notifier, build_notifier
from .state import State
from .transcript import load_transcript
from .zoom import ZoomClient

log = logging.getLogger(__name__)

GB = 1024 ** 3


def _tz(config: Config):
    from zoneinfo import ZoneInfo

    try:
        return ZoneInfo(config.timezone_name)
    except Exception:
        log.warning("Unknown timezone %r; using UTC", config.timezone_name)
        return timezone.utc


class Pipeline:
    def __init__(self, config: Config, dry_run: bool = False):
        self.config = config
        self.dry_run = dry_run
        self.tz = _tz(config)
        self.state = State(config.resolve_path("runtime", "state_db", default="./state.db"))
        self.work_dir = config.resolve_path("runtime", "work_dir", default="./work")
        self.work_dir.mkdir(parents=True, exist_ok=True)
        self.notifier: Notifier = build_notifier(config)
        self._zoom: Optional[ZoomClient] = None
        self._drive: Optional[DriveClient] = None
        self._root_id: Optional[str] = None

    # -- lazily built clients ----------------------------------------------
    @property
    def zoom(self) -> ZoomClient:
        if self._zoom is None:
            self._zoom = ZoomClient(
                require_env("ZOOM_ACCOUNT_ID"),
                require_env("ZOOM_CLIENT_ID"),
                require_env("ZOOM_CLIENT_SECRET"),
            )
        return self._zoom

    @property
    def drive(self) -> DriveClient:
        if self._drive is None:
            self._drive = DriveClient(
                self.config.get("drive", "oauth_scope", default="drive.file")
            )
        return self._drive

    def drive_root(self) -> Optional[str]:
        if self._root_id is None:
            pinned = self.config.get("drive", "root_folder_id")
            if pinned:
                self._root_id = pinned
            else:
                self._root_id = self.drive.ensure_folder(
                    self.config.get("drive", "root_folder_name", default="Teaching Archive")
                )
        return self._root_id

    def close(self) -> None:
        self.state.close()

    # -- main loop ----------------------------------------------------------
    def run_once(self) -> dict:
        run_id = self.state.start_run()
        found = processed = failed = 0

        lookback = int(self.config.get("zoom", "lookback_days", default=3))
        recordings = self.zoom.list_recordings(lookback_days=lookback)
        by_uuid = {rec.uuid: rec for rec in recordings}

        for rec in recordings:
            if self.state.discover(rec):
                found += 1
                log.info("New recording: %s (%s)", rec.topic, rec.start.isoformat())

        events = self._load_events(recordings)
        max_attempts = int(self.config.get("runtime", "max_attempts", default=4))

        for row in self.state.pending(max_attempts=max_attempts):
            recording = by_uuid.get(row["uuid"])
            if recording is None:
                # Gone from Zoom. If we had already verified the Drive copy the
                # work is genuinely finished; otherwise it can never complete.
                if row["stage"] in ("VERIFIED", "ZOOM_CLEARED"):
                    self.state.set_stage(row["uuid"], "DONE")
                else:
                    log.warning(
                        "Recording %s is no longer in Zoom at stage %s; marking skipped",
                        row["uuid"], row["stage"],
                    )
                    self.state.update(
                        row["uuid"], stage="SKIPPED",
                        last_error="disappeared from Zoom before archiving",
                    )
                continue

            try:
                self._process(recording, events)
                processed += 1
            except Exception as exc:
                failed += 1
                attempts = self.state.record_failure(recording.uuid, str(exc))
                log.exception(
                    "Failed on %s (attempt %d/%d)", recording.topic, attempts, max_attempts
                )
                if attempts >= max_attempts:
                    self.notifier.send(
                        f"⚠️ Giving up on <b>{recording.topic}</b> after {attempts} "
                        f"attempts.\n<code>{str(exc)[:300]}</code>",
                        key=recording.uuid,
                    )

        self._check_zoom_storage()
        self.state.finish_run(run_id, found, processed, failed)
        return {"found": found, "processed": processed, "failed": failed}

    def _load_events(self, recordings: list[ZoomRecording]):
        """Read the calendar window covering the recordings in hand."""
        if not recordings:
            return []
        earliest = min(r.start for r in recordings) - timedelta(days=1)
        latest = max(r.end for r in recordings) + timedelta(days=1)
        reader = CalendarReader(
            source=self.config.get("calendar", "source", default="caldav"),
            calendar_name=self.config.get("calendar", "calendar_name", default="Teaching"),
            known_subjects=self.config.known_subjects,
            tz=self.tz,
        )
        try:
            events = reader.events_between(earliest, latest)
            log.info("Loaded %d calendar events", len(events))
            return events
        except Exception as exc:
            # Without the calendar the classifier still works, so degrade
            # rather than refuse to archive anything.
            log.warning("Calendar unavailable (%s); relying on transcript only", exc)
            return []

    # -- per-recording stages ----------------------------------------------
    def _process(self, recording: ZoomRecording, events) -> None:
        row = self.state.get(recording.uuid)
        stage = row["stage"] if row else "DISCOVERED"
        session_dir = self.work_dir / _safe_key(recording.uuid)
        session_dir.mkdir(parents=True, exist_ok=True)

        audio_path = session_dir / "audio.m4a"
        vtt_path = session_dir / "transcript.vtt"
        video_path = session_dir / "video.mp4"

        self.notifier.send(
            f"📥 Received <b>{recording.topic or 'recording'}</b>\n"
            f"{recording.start.astimezone(self.tz):%d %b %Y, %H:%M} · "
            f"{recording.duration_minutes} min",
            key=recording.uuid,
        )

        # 1. Audio first. ~40 MB against ~700 MB of video, and enough to decide.
        if _before(stage, "AUDIO_FETCHED"):
            if self.dry_run:
                log.info("[dry-run] would download audio for %s", recording.topic)
            else:
                if recording.audio_url:
                    self.zoom.download(recording.audio_url, audio_path, recording.download_token)
                if recording.transcript_url:
                    try:
                        self.zoom.download(
                            recording.transcript_url, vtt_path, recording.download_token
                        )
                    except Exception as exc:
                        log.warning("Transcript download failed (%s); will use Whisper", exc)
            self.state.set_stage(recording.uuid, "AUDIO_FETCHED")

        # 2. Transcript: Zoom's VTT if usable, else local Whisper.
        transcript_cfg = self.config.get("transcript", default={}) or {}
        transcript = load_transcript(
            vtt_path if vtt_path.exists() else None,
            audio_path if audio_path.exists() else None,
            min_usable_chars=int(transcript_cfg.get("min_usable_chars", 400)),
            whisper_fallback=bool(transcript_cfg.get("whisper_fallback", True)),
            whisper_model=transcript_cfg.get("whisper_model", "small"),
        )
        sample_cfg = transcript_cfg.get("sample", {}) or {}
        sample = transcript.sample(
            head_minutes=int(sample_cfg.get("head_minutes", 10)),
            chunk_count=int(sample_cfg.get("chunk_count", 3)),
            chunk_minutes=int(sample_cfg.get("chunk_minutes", 2)),
        )
        self.state.set_stage(recording.uuid, "TRANSCRIBED")

        # 3. Match the calendar, then have Claude verify against it.
        match = match_recording(
            recording,
            events,
            tolerance_minutes=int(
                self.config.get("calendar", "match_tolerance_minutes", default=20)
            ),
            ambiguity_margin=float(
                self.config.get("calendar", "ambiguity_margin", default=0.10)
            ),
        )

        classification = None
        if not self.dry_run:
            classification = classify(
                recording.topic,
                match.event,
                sample,
                self.config.get("syllabus", default={}) or {},
                backend=self.config.get("classify", "backend", default="api"),
                model=self.config.get("classify", "model", default="claude-opus-5"),
            )
        self.state.set_stage(recording.uuid, "CLASSIFIED")

        decision = decide(
            recording, match, classification,
            watch=self.config.watch,
            auto_file_threshold=float(
                self.config.get("classify", "auto_file_threshold", default=0.85)
            ),
            review_threshold=float(
                self.config.get("classify", "review_threshold", default=0.60)
            ),
            video_for_watched_only=bool(
                self.config.get("runtime", "video_for_watched_only", default=False)
            ),
        )

        folder_segments = build_folder_path(recording, decision, self.config.data)
        self.state.update(
            recording.uuid,
            stage="DECIDED",
            route=decision.route.value,
            subject=decision.subject,
            form=decision.form,
            chapter=decision.chapter,
            confidence=decision.confidence,
            calendar_uid=match.event.uid if match.event else None,
            calendar_title=match.event.title if match.event else None,
            drive_path="/".join(folder_segments),
            decision_json={
                "reason": decision.reason,
                "divergence": decision.divergence,
                "notes": decision.notes,
                "transcript_source": transcript.source,
                "match_score": round(match.score, 3),
                "summary": classification.summary if classification else "",
            },
        )

        log.info(
            "%s -> %s (%s, %.2f) %s",
            recording.topic, decision.route.value, "/".join(folder_segments),
            decision.confidence, decision.reason,
        )

        if self.dry_run:
            self.notifier.send(self._summary(recording, decision, dry_run=True), key=recording.uuid)
            self.state.set_stage(recording.uuid, "DISCOVERED")  # leave for a real run
            return

        wants_video = decision.route in (Route.ARCHIVE, Route.REVIEW)

        # 4. Only now is the big file worth fetching.
        if wants_video and _before(stage, "VIDEO_FETCHED"):
            if not recording.video_url:
                log.warning("No video file available for %s", recording.topic)
                wants_video = False
            else:
                self.notifier.send(
                    self._summary(recording, decision, stage_note="downloading video…"),
                    key=recording.uuid,
                )
                self.zoom.download(recording.video_url, video_path, recording.download_token)
        self.state.set_stage(recording.uuid, "VIDEO_FETCHED")

        # 5. Upload.
        parent_id = self.drive.ensure_path(folder_segments, self.drive_root())
        uploaded_video_id = None
        expected_bytes = 0

        if wants_video and video_path.exists():
            name = build_filename(recording, decision, "mp4")
            self.notifier.send(
                self._summary(recording, decision, stage_note="uploading to Drive…"),
                key=recording.uuid,
            )
            result = self.drive.upload(video_path, name, parent_id, "video/mp4")
            uploaded_video_id = result["id"]
            expected_bytes = video_path.stat().st_size

        # Audio and transcript are always kept: they are the searchable record
        # and cost about 4% of what the video does.
        if audio_path.exists():
            self.drive.upload(
                audio_path, build_filename(recording, decision, "m4a"), parent_id, "audio/mp4"
            )
        if vtt_path.exists():
            self.drive.upload(
                vtt_path, build_filename(recording, decision, "vtt"), parent_id, "text/vtt"
            )

        self.state.update(
            recording.uuid, stage="UPLOADED",
            drive_file_id=uploaded_video_id,
            bytes_expected=expected_bytes,
            video_archived=1 if uploaded_video_id else 0,
        )

        # 6. Verify before anything is destroyed.
        verified = True
        if uploaded_video_id and expected_bytes:
            verified = self.drive.verify(uploaded_video_id, expected_bytes)
        if not verified:
            raise RuntimeError("Drive copy did not match the local file size")
        self.state.update(recording.uuid, stage="VERIFIED", bytes_uploaded=expected_bytes)

        # 7. Reclaim Zoom storage, but only once the copy is proven good.
        if self.config.get("zoom", "delete_after_archive", default=True):
            self.zoom.delete_recording(
                recording.uuid, self.config.get("zoom", "delete_action", default="trash")
            )
            self.state.set_stage(recording.uuid, "ZOOM_CLEARED")

        for path in (audio_path, vtt_path, video_path):
            path.unlink(missing_ok=True)
        try:
            session_dir.rmdir()
        except OSError:
            pass

        self.state.set_stage(recording.uuid, "DONE")
        self.notifier.send(self._summary(recording, decision, done=True), key=recording.uuid)

    # -- messages -----------------------------------------------------------
    def _summary(
        self, recording: ZoomRecording, decision, *,
        done: bool = False, dry_run: bool = False, stage_note: str = "",
    ) -> str:
        icon = {"archive": "✅", "review": "🔎", "audio_only": "🗂"}.get(
            decision.route.value, "•"
        )
        where = "/".join(build_folder_path(recording, decision, self.config.data))

        lines = [
            f"{icon} <b>{recording.topic or 'Recording'}</b>",
            f"{recording.start.astimezone(self.tz):%d %b %Y, %H:%M} · "
            f"{recording.duration_minutes} min",
        ]
        if decision.subject:
            label = " ".join(
                part for part in (decision.subject, decision.form, decision.chapter) if part
            )
            lines.append(f"📘 {label}  ({decision.confidence:.0%} confident)")
        lines.append(f"📁 {where}")
        if decision.divergence:
            lines.append(f"↔️ {decision.divergence}")
        for note in decision.notes:
            lines.append(f"ℹ️ {note}")
        if decision.route is Route.REVIEW:
            lines.append(f"⚠️ Needs a look: {decision.reason}")
        if decision.route is Route.AUDIO_ONLY:
            lines.append("💾 Video not archived — audio and transcript kept")
        if stage_note:
            lines.append(f"⏳ {stage_note}")
        if dry_run:
            lines.append("🧪 dry run — nothing was downloaded, filed or deleted")
        elif done:
            lines.append("Done.")
        return "\n".join(lines)

    # -- guards and housekeeping -------------------------------------------
    def _check_zoom_storage(self) -> None:
        """Warn before Zoom's allowance fills and it stops recording entirely.

        This is the failure mode that costs real lessons: every other error
        here loses an archive, but a full Zoom account loses the recording.
        """
        try:
            plan_gb = float(self.config.get("zoom", "plan_storage_gb", default=10))
            threshold = float(self.config.get("zoom", "storage_warn_fraction", default=0.6))
            used = self.zoom.storage_used_bytes() / GB
            if plan_gb > 0 and used / plan_gb >= threshold:
                self.notifier.send(
                    f"⚠️ Zoom cloud storage is at <b>{used:.1f} GB of {plan_gb:.0f} GB</b>. "
                    "If it fills, Zoom stops recording. Check whether archiving has stalled."
                )
        except Exception as exc:
            log.warning("Could not check Zoom storage: %s", exc)

    def reconcile(self, days: int = 1) -> dict:
        """Compare lessons scheduled against lessons archived.

        Every other failure in this system is silent - a crashed job, a lost
        download and a quiet day all look identical. Checking the schedule is
        what converts silence into a notification.
        """
        now = datetime.now(self.tz)
        window_start = (now - timedelta(days=days)).replace(hour=0, minute=0, second=0)
        window_end = now

        reader = CalendarReader(
            source=self.config.get("calendar", "source", default="caldav"),
            calendar_name=self.config.get("calendar", "calendar_name", default="Teaching"),
            known_subjects=self.config.known_subjects,
            tz=self.tz,
        )
        events = [
            e for e in reader.events_between(window_start, window_end)
            if not e.is_all_day and e.end <= now
        ]
        archived = self.state.archived_between(
            window_start.astimezone(timezone.utc), window_end.astimezone(timezone.utc)
        )
        matched_uids = {row["calendar_uid"] for row in archived if row["calendar_uid"]}
        missing = [e for e in events if e.uid not in matched_uids]

        stuck = self.state.stuck(
            int(self.config.get("runtime", "max_attempts", default=4))
        )

        if missing or stuck:
            lines = ["🔔 <b>Archive check</b>"]
            if missing:
                lines.append(f"\n{len(missing)} scheduled lesson(s) with no archive:")
                lines += [
                    f"  • {e.title} ({e.start.astimezone(self.tz):%d %b %H:%M})"
                    for e in missing[:10]
                ]
            if stuck:
                lines.append(f"\n{len(stuck)} recording(s) stuck after repeated failures:")
                lines += [
                    f"  • {row['topic']} — {(row['last_error'] or '')[:120]}"
                    for row in stuck[:10]
                ]
            self.notifier.send("\n".join(lines))
        else:
            log.info("Reconciliation clean: %d lessons, all archived", len(events))

        return {
            "scheduled": len(events),
            "archived": len(archived),
            "missing": len(missing),
            "stuck": len(stuck),
        }

    def sweep(self) -> dict:
        """Retention tiering: drop video past the cutoff, keep audio and transcript.

        Audio plus transcript is roughly 4% of the video's size, so this is
        what turns a fixed 400 GB of Drive from a runway into a plateau.
        """
        months = int(self.config.get("retention", "video_months", default=12))
        cutoff = datetime.now(timezone.utc) - timedelta(days=months * 30)
        candidates = self.state.video_archives_older_than(cutoff)

        removed = 0
        freed = 0
        for row in candidates:
            if not row["drive_file_id"]:
                continue
            if self.dry_run:
                log.info("[dry-run] would drop video for %s", row["topic"])
                removed += 1
                continue
            try:
                self.drive.delete_file(row["drive_file_id"])
                freed += int(row["bytes_expected"] or 0)
                self.state.update(row["uuid"], video_archived=0, drive_file_id=None)
                removed += 1
            except Exception as exc:
                log.warning("Could not drop video for %s: %s", row["topic"], exc)

        if removed:
            self.notifier.send(
                f"🧹 Retention sweep: dropped video from {removed} lesson(s) older than "
                f"{months} months, freeing {freed / GB:.1f} GB. Audio and transcripts kept."
            )
        return {"considered": len(candidates), "removed": removed, "freed_gb": freed / GB}


def _before(current: str, target: str) -> bool:
    """True if the recording has not yet reached `target`."""
    from .state import STAGES

    try:
        return STAGES.index(current) < STAGES.index(target)
    except ValueError:
        return True


def _safe_key(uuid: str) -> str:
    return "".join(c if c.isalnum() else "_" for c in uuid)[:64]
