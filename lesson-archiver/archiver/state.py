"""SQLite state store.

Two jobs, both essential rather than bookkeeping niceties:

1. Idempotency. Polling returns the same recording on every cycle until it is
   removed from Zoom, so without a uniqueness key on the recording UUID the
   same lesson is archived repeatedly.
2. Resumability. A crash part-way through a 1 GB upload should resume at the
   last completed stage instead of re-downloading everything.
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator, Optional

# Ordered pipeline stages. Restart resumes at the first incomplete one.
STAGES = [
    "DISCOVERED",
    "AUDIO_FETCHED",
    "TRANSCRIBED",
    "CLASSIFIED",
    "DECIDED",
    "VIDEO_FETCHED",
    "UPLOADED",
    "VERIFIED",
    "ZOOM_CLEARED",
    "DONE",
]
TERMINAL = {"DONE", "SKIPPED", "FAILED"}

SCHEMA = """
CREATE TABLE IF NOT EXISTS recordings (
    uuid            TEXT PRIMARY KEY,
    meeting_id      TEXT,
    topic           TEXT,
    start_time      TEXT NOT NULL,
    duration_min    INTEGER,
    stage           TEXT NOT NULL DEFAULT 'DISCOVERED',
    route           TEXT,
    subject         TEXT,
    form            TEXT,
    chapter         TEXT,
    confidence      REAL,
    calendar_uid    TEXT,
    calendar_title  TEXT,
    decision_json   TEXT,
    drive_file_id   TEXT,
    drive_path      TEXT,
    bytes_expected  INTEGER DEFAULT 0,
    bytes_uploaded  INTEGER DEFAULT 0,
    video_archived  INTEGER DEFAULT 0,
    attempts        INTEGER DEFAULT 0,
    last_error      TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recordings_stage ON recordings(stage);
CREATE INDEX IF NOT EXISTS idx_recordings_start ON recordings(start_time);

CREATE TABLE IF NOT EXISTS runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at  TEXT NOT NULL,
    finished_at TEXT,
    found       INTEGER DEFAULT 0,
    processed   INTEGER DEFAULT 0,
    failed      INTEGER DEFAULT 0,
    note        TEXT
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class State:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(self.path))
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)
        self.conn.commit()

    def close(self) -> None:
        self.conn.close()

    @contextmanager
    def transaction(self) -> Iterator[sqlite3.Connection]:
        try:
            yield self.conn
            self.conn.commit()
        except Exception:
            self.conn.rollback()
            raise

    # -- recordings ---------------------------------------------------------
    def seen(self, uuid: str) -> bool:
        cur = self.conn.execute("SELECT 1 FROM recordings WHERE uuid = ?", (uuid,))
        return cur.fetchone() is not None

    def discover(self, recording) -> bool:
        """Register a newly seen recording. Returns False if already known."""
        if self.seen(recording.uuid):
            return False
        with self.transaction() as conn:
            conn.execute(
                """INSERT INTO recordings
                   (uuid, meeting_id, topic, start_time, duration_min,
                    stage, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, 'DISCOVERED', ?, ?)""",
                (
                    recording.uuid,
                    str(recording.meeting_id),
                    recording.topic,
                    recording.start.isoformat(),
                    recording.duration_minutes,
                    _now(),
                    _now(),
                ),
            )
        return True

    def get(self, uuid: str) -> Optional[sqlite3.Row]:
        cur = self.conn.execute("SELECT * FROM recordings WHERE uuid = ?", (uuid,))
        return cur.fetchone()

    def update(self, uuid: str, **fields: Any) -> None:
        if not fields:
            return
        if "decision_json" in fields and not isinstance(fields["decision_json"], str):
            fields["decision_json"] = json.dumps(fields["decision_json"], default=str)
        fields["updated_at"] = _now()
        assignments = ", ".join(f"{key} = ?" for key in fields)
        with self.transaction() as conn:
            conn.execute(
                f"UPDATE recordings SET {assignments} WHERE uuid = ?",
                (*fields.values(), uuid),
            )

    def set_stage(self, uuid: str, stage: str) -> None:
        self.update(uuid, stage=stage)

    def record_failure(self, uuid: str, error: str) -> int:
        row = self.get(uuid)
        attempts = (row["attempts"] if row else 0) + 1
        self.update(uuid, attempts=attempts, last_error=str(error)[:2000])
        return attempts

    def pending(self, max_attempts: int = 4) -> list[sqlite3.Row]:
        """Recordings that still have work left, oldest first."""
        placeholders = ", ".join("?" for _ in TERMINAL)
        cur = self.conn.execute(
            f"""SELECT * FROM recordings
                WHERE stage NOT IN ({placeholders}) AND attempts < ?
                ORDER BY start_time ASC""",
            (*TERMINAL, max_attempts),
        )
        return cur.fetchall()

    def archived_between(self, start: datetime, end: datetime) -> list[sqlite3.Row]:
        cur = self.conn.execute(
            """SELECT * FROM recordings
               WHERE start_time >= ? AND start_time <= ? AND stage = 'DONE'
               ORDER BY start_time ASC""",
            (start.isoformat(), end.isoformat()),
        )
        return cur.fetchall()

    def video_archives_older_than(self, cutoff: datetime) -> list[sqlite3.Row]:
        """Archived lessons still holding full video past the retention cutoff."""
        cur = self.conn.execute(
            """SELECT * FROM recordings
               WHERE video_archived = 1 AND start_time < ? AND stage = 'DONE'
               ORDER BY start_time ASC""",
            (cutoff.isoformat(),),
        )
        return cur.fetchall()

    def stuck(self, max_attempts: int = 4) -> list[sqlite3.Row]:
        cur = self.conn.execute(
            "SELECT * FROM recordings WHERE attempts >= ? AND stage NOT IN ('DONE','SKIPPED')",
            (max_attempts,),
        )
        return cur.fetchall()

    # -- runs ---------------------------------------------------------------
    def start_run(self) -> int:
        with self.transaction() as conn:
            cur = conn.execute("INSERT INTO runs (started_at) VALUES (?)", (_now(),))
        return int(cur.lastrowid)

    def finish_run(
        self, run_id: int, found: int, processed: int, failed: int, note: str = ""
    ) -> None:
        with self.transaction() as conn:
            conn.execute(
                """UPDATE runs SET finished_at = ?, found = ?, processed = ?,
                   failed = ?, note = ? WHERE id = ?""",
                (_now(), found, processed, failed, note, run_id),
            )
