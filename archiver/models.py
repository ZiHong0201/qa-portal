"""Core data types.

Everything here is plain data with no I/O, so the decision logic in
`matching`, `fusion` and `naming` can be unit tested without credentials.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional

# "F5", "Form 5", "Tingkatan 5", "T5" -> 5
_FORM_RE = re.compile(r"\b(?:form|tingkatan|ting|f|t)\s*\.?\s*([1-6])\b", re.I)
# "Ch3", "Chapter 03", "Bab 3" -> 3
_CHAPTER_RE = re.compile(r"\b(?:chapter|chap|ch|bab|b)\s*\.?\s*(\d{1,2})\b", re.I)


def normalise_form(value: Optional[str]) -> Optional[str]:
    """Return a canonical 'Form N' string, or None if no form is present."""
    if not value:
        return None
    match = _FORM_RE.search(value)
    if match:
        return f"Form {match.group(1)}"
    return None


def normalise_chapter(value: Optional[str]) -> Optional[str]:
    """Return a canonical zero-padded 'ChNN' key, or None."""
    if not value:
        return None
    match = _CHAPTER_RE.search(value)
    if match:
        return f"Ch{int(match.group(1)):02d}"
    return None


@dataclass(frozen=True)
class CalendarEvent:
    """One event read from Apple Calendar.

    `subject`, `form` and `chapter` are parsed from the title on construction
    via `from_raw`; they are the declared ground truth the classifier is
    checked against.
    """

    uid: str
    title: str
    start: datetime
    end: datetime
    notes: str = ""
    subject: Optional[str] = None
    form: Optional[str] = None
    chapter: Optional[str] = None

    @property
    def duration(self) -> timedelta:
        return self.end - self.start

    @property
    def is_all_day(self) -> bool:
        """All-day entries are never lessons; they would swamp overlap scoring."""
        return self.duration >= timedelta(hours=23)

    @classmethod
    def from_raw(
        cls,
        uid: str,
        title: str,
        start: datetime,
        end: datetime,
        notes: str = "",
        known_subjects: Optional[list[str]] = None,
    ) -> "CalendarEvent":
        subject = _parse_subject(title, known_subjects or [])
        return cls(
            uid=uid,
            title=title,
            start=start,
            end=end,
            notes=notes,
            subject=subject,
            form=normalise_form(title),
            chapter=normalise_chapter(title),
        )


def _parse_subject(title: str, known_subjects: list[str]) -> Optional[str]:
    """Resolve the subject from an event title.

    Prefers an exact match against the configured subject list so that
    "Physics F5" and "physics form 5 revision" both land on "Physics". Falls
    back to the leading words before the form token, which keeps subjects the
    user has not yet configured working rather than silently dropping them.
    """
    lowered = title.lower()
    for subject in sorted(known_subjects, key=len, reverse=True):
        if subject.lower() in lowered:
            return subject

    head = _FORM_RE.split(title)[0]
    head = re.split(r"[-–—:|(]", head)[0]
    head = head.strip(" \t-–—:|")
    return head or None


@dataclass(frozen=True)
class ZoomRecording:
    """A single Zoom cloud recording session (one meeting instance)."""

    uuid: str
    meeting_id: str
    topic: str
    start: datetime
    duration_minutes: int
    video_file_id: Optional[str] = None
    video_url: Optional[str] = None
    video_bytes: int = 0
    audio_file_id: Optional[str] = None
    audio_url: Optional[str] = None
    audio_bytes: int = 0
    transcript_url: Optional[str] = None
    download_token: Optional[str] = None

    @property
    def end(self) -> datetime:
        return self.start + timedelta(minutes=self.duration_minutes)


@dataclass(frozen=True)
class Classification:
    """What Claude read out of the transcript."""

    subject: Optional[str]
    form: Optional[str]
    chapter: Optional[str]
    confidence: float
    summary: str = ""
    is_academic: bool = True
    agrees_with_calendar: Optional[bool] = None


class Route(Enum):
    """Where a recording ends up."""

    ARCHIVE = "archive"        # full video, filed under subject/form/chapter
    REVIEW = "review"          # full video, filed under _Review for a human look
    AUDIO_ONLY = "audio_only"  # video never downloaded; audio + transcript kept


@dataclass
class MatchResult:
    """Outcome of joining a recording to the calendar."""

    event: Optional[CalendarEvent] = None
    score: float = 0.0
    ambiguous: bool = False
    runner_up: Optional[CalendarEvent] = None
    runner_up_score: float = 0.0

    @property
    def matched(self) -> bool:
        return self.event is not None and not self.ambiguous


@dataclass
class Decision:
    """The final routing decision for one recording."""

    route: Route
    subject: Optional[str] = None
    form: Optional[str] = None
    chapter: Optional[str] = None
    confidence: float = 0.0
    reason: str = ""
    divergence: Optional[str] = None
    is_watched: bool = False
    notes: list[str] = field(default_factory=list)
