"""Integration tests for the pipeline's ordering and idempotency guarantees.

Zoom, Drive, the calendar and Claude are all faked. What is under test is the
orchestration: that the big file is only fetched when the decision calls for
it, that nothing is deleted from Zoom before the Drive copy is verified, and
that a second poll does not archive the same lesson twice.
"""

from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from archiver.config import Config
from archiver.models import CalendarEvent, Classification, ZoomRecording

KL = timezone(timedelta(hours=8))


def make_config(tmp_path: Path) -> Config:
    return Config({
        "timezone": "UTC",
        "zoom": {"lookback_days": 3, "delete_action": "trash", "delete_after_archive": True,
                 "plan_storage_gb": 10, "storage_warn_fraction": 0.6},
        "calendar": {"source": "caldav", "calendar_name": "Teaching",
                     "match_tolerance_minutes": 20, "ambiguity_margin": 0.10},
        "transcript": {"min_usable_chars": 10, "whisper_fallback": False,
                       "sample": {"head_minutes": 10, "chunk_count": 1, "chunk_minutes": 2}},
        "classify": {"backend": "api", "auto_file_threshold": 0.85, "review_threshold": 0.60},
        "drive": {"root_folder_name": "Teaching Archive", "oauth_scope": "drive.file",
                  "review_folder": "_Review", "unsorted_folder": "_Unsorted"},
        "watch": [{"subject": "Physics", "form": "Form 5"}],
        "syllabus": {"Physics": {"Form 5": ["Ch03 - Electricity and Magnetism"]}},
        "retention": {"video_months": 12},
        "notify": {"backend": "none"},
        "runtime": {"work_dir": str(tmp_path / "work"), "state_db": str(tmp_path / "state.db"),
                    "max_attempts": 4, "video_for_watched_only": False},
    })


RECORDING = ZoomRecording(
    uuid="abc/def==", meeting_id="1", topic="Physics F5",
    start=datetime(2026, 9, 17, 8, 5, tzinfo=timezone.utc), duration_minutes=80,
    video_file_id="v1", video_url="https://zoom.test/v", video_bytes=700_000_000,
    audio_file_id="a1", audio_url="https://zoom.test/a", audio_bytes=40_000_000,
    transcript_url="https://zoom.test/t",
)

EVENT = CalendarEvent.from_raw(
    "evt-1", "Physics F5 - Ch3 Electricity",
    datetime(2026, 9, 17, 8, 0, tzinfo=timezone.utc),
    datetime(2026, 9, 17, 9, 30, tzinfo=timezone.utc),
    known_subjects=["Physics"],
)


class FakeZoom:
    def __init__(self, recordings): 
        self.recordings = recordings
        self.downloaded = []
        self.deleted = []
    def list_recordings(self, lookback_days=3): return list(self.recordings)
    def storage_used_bytes(self, lookback_days=120): return 1_000_000
    def download(self, url, dest, token=None):
        self.downloaded.append(url)
        dest.parent.mkdir(parents=True, exist_ok=True)
        if url.endswith("/t"):
            dest.write_text("WEBVTT\n\n1\n00:00:01.000 --> 00:00:09.000\n"
                            "Teacher: today chapter 3 electricity and current.\n")
        else:
            dest.write_bytes(b"x" * 2048)
        return dest.stat().st_size
    def delete_recording(self, uuid, action="trash"): self.deleted.append((uuid, action))


class FakeDrive:
    def __init__(self, verify_ok=True):
        self.verify_ok = verify_ok
        self.uploaded = []
        self.deleted = []
    def ensure_folder(self, name, parent_id=None): return f"folder:{name}"
    def ensure_path(self, segments, root_id=None): return "folder:" + "/".join(segments)
    def upload(self, local_path, name, parent_id, mime_type="video/mp4"):
        self.uploaded.append((name, parent_id))
        return {"id": f"file:{name}", "size": str(local_path.stat().st_size)}
    def verify(self, file_id, expected_bytes): return self.verify_ok
    def delete_file(self, file_id): self.deleted.append(file_id)


@pytest.fixture
def pipeline(tmp_path, monkeypatch):
    from archiver import pipeline as pipeline_module

    monkeypatch.setattr(pipeline_module, "classify",
                        lambda *a, **k: Classification("Physics", "Form 5", "Ch03", 0.95))
    monkeypatch.setattr(pipeline_module.Pipeline, "_load_events", lambda self, recs: [EVENT])

    built = pipeline_module.Pipeline(make_config(tmp_path))
    built._zoom = FakeZoom([RECORDING])
    built._drive = FakeDrive()
    built._root_id = "root"
    return built


def test_happy_path_archives_then_clears_zoom(pipeline):
    result = pipeline.run_once()
    assert result == {"found": 1, "processed": 1, "failed": 0}

    row = pipeline.state.get(RECORDING.uuid)
    assert row["stage"] == "DONE"
    assert row["route"] == "archive"
    assert (row["subject"], row["form"], row["chapter"]) == ("Physics", "Form 5", "Ch03")
    assert row["drive_path"] == "Physics/Form 5/2026/Ch03 - Electricity and Magnetism"

    names = [name for name, _ in pipeline._drive.uploaded]
    assert "PHY-F5_Ch03_2026-09-17_0805.mp4" in names
    assert any(n.endswith(".m4a") for n in names)   # searchable record always kept
    assert any(n.endswith(".vtt") for n in names)
    assert pipeline._drive.uploaded[0][1] == "folder:Physics/Form 5/2026/Ch03 - Electricity and Magnetism"

    assert pipeline._zoom.deleted == [(RECORDING.uuid, "trash")]
    pipeline.close()


def test_second_poll_does_not_rearchive(pipeline):
    pipeline.run_once()
    uploads_after_first = len(pipeline._drive.uploaded)
    second = pipeline.run_once()

    assert second["found"] == 0
    assert len(pipeline._drive.uploaded) == uploads_after_first
    assert len(pipeline._zoom.deleted) == 1
    pipeline.close()


def test_failed_verification_never_deletes_from_zoom(pipeline):
    # The one ordering that must not regress: a bad Drive copy keeps Zoom's.
    pipeline._drive.verify_ok = False
    result = pipeline.run_once()

    assert result["failed"] == 1
    assert pipeline._zoom.deleted == []
    row = pipeline.state.get(RECORDING.uuid)
    assert row["stage"] != "DONE"
    assert row["attempts"] == 1
    pipeline.close()


def test_dry_run_touches_nothing(tmp_path, monkeypatch):
    from archiver import pipeline as pipeline_module

    monkeypatch.setattr(pipeline_module.Pipeline, "_load_events", lambda self, recs: [EVENT])
    built = pipeline_module.Pipeline(make_config(tmp_path), dry_run=True)
    built._zoom = FakeZoom([RECORDING])
    built._drive = FakeDrive()
    built._root_id = "root"

    built.run_once()
    assert built._zoom.downloaded == []
    assert built._drive.uploaded == []
    assert built._zoom.deleted == []
    # Left pending so a real run still picks it up.
    assert built.state.get(RECORDING.uuid)["stage"] == "DISCOVERED"
    built.close()


def test_staff_meeting_never_downloads_video(tmp_path, monkeypatch):
    from archiver import pipeline as pipeline_module

    monkeypatch.setattr(pipeline_module, "classify",
                        lambda *a, **k: Classification(None, None, None, 0.1, is_academic=False))
    monkeypatch.setattr(pipeline_module.Pipeline, "_load_events", lambda self, recs: [])

    built = pipeline_module.Pipeline(make_config(tmp_path))
    built._zoom = FakeZoom([RECORDING])
    built._drive = FakeDrive()
    built._root_id = "root"
    built.run_once()

    assert "https://zoom.test/v" not in built._zoom.downloaded  # the 700 MB file
    assert "https://zoom.test/a" in built._zoom.downloaded      # the 40 MB one
    assert built.state.get(RECORDING.uuid)["route"] == "audio_only"
    built.close()


def test_recording_vanished_from_zoom_is_marked_skipped(tmp_path, monkeypatch):
    from archiver import pipeline as pipeline_module

    monkeypatch.setattr(pipeline_module.Pipeline, "_load_events", lambda self, recs: [EVENT])
    built = pipeline_module.Pipeline(make_config(tmp_path))
    built._zoom = FakeZoom([RECORDING])
    built._drive = FakeDrive()
    built._root_id = "root"

    built.state.discover(RECORDING)
    built._zoom.recordings = []          # deleted in the Zoom web UI meanwhile
    built.run_once()

    assert built.state.get(RECORDING.uuid)["stage"] == "SKIPPED"
    built.close()
