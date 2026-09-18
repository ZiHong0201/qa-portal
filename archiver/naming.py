"""Deterministic file names and Drive folder paths.

Names are built from the decision, never from the Zoom meeting topic, so that
two recordings of the same lesson always land in the same place and a re-run
after a partial failure overwrites rather than duplicates.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Optional

from .models import Decision, Route, ZoomRecording

_UNSAFE = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
_SPACES = re.compile(r"\s+")
MAX_NAME_LEN = 120


def sanitise(name: str, fallback: str = "Unnamed") -> str:
    """Make a string safe as a Drive file or folder name."""
    if not name:
        return fallback
    name = unicodedata.normalize("NFKC", name)
    name = _UNSAFE.sub("-", name)
    name = _SPACES.sub(" ", name).strip(" .-")
    if len(name) > MAX_NAME_LEN:
        name = name[:MAX_NAME_LEN].rstrip(" .-")
    return name or fallback


def subject_code(subject: Optional[str]) -> str:
    """Short prefix for file names: 'Physics' -> 'PHY'."""
    if not subject:
        return "GEN"
    letters = re.sub(r"[^A-Za-z]", "", subject).upper()
    return (letters[:3] or "GEN").ljust(3, "X")


def form_code(form: Optional[str]) -> str:
    """'Form 5' -> 'F5'."""
    if not form:
        return "F0"
    digits = re.sub(r"\D", "", form)
    return f"F{digits}" if digits else "F0"


def resolve_chapter_folder(
    subject: Optional[str],
    form: Optional[str],
    chapter_key: Optional[str],
    syllabus: dict,
) -> str:
    """Expand a 'Ch03' key into the full configured folder name.

    An unlisted chapter is not an error - the syllabus in config is a
    convenience for readable folder names, not a validation gate - so an
    unknown key files under its own name rather than being rejected.
    """
    if not chapter_key:
        return "Unsorted-Chapter"
    entries = (syllabus.get(subject or "", {}) or {}).get(form or "", []) or []
    for entry in entries:
        if entry.upper().startswith(chapter_key.upper()):
            return entry
    return chapter_key


def build_filename(
    recording: ZoomRecording, decision: Decision, extension: str = "mp4"
) -> str:
    """e.g. PHY-F5_Ch03_2026-09-17_1600.mp4"""
    stamp = recording.start.strftime("%Y-%m-%d_%H%M")
    parts = [
        f"{subject_code(decision.subject)}-{form_code(decision.form)}",
        decision.chapter or "NoCh",
        stamp,
    ]
    return sanitise("_".join(parts)) + f".{extension}"


def build_folder_path(
    recording: ZoomRecording, decision: Decision, config: dict
) -> list[str]:
    """Folder segments below the configured Drive root.

    Archived:  Physics / Form 5 / 2026 / Ch03 - Electricity and Magnetism
    Review:    _Review / 2026-09
    Audio only:_Unsorted / 2026-09
    """
    drive_cfg = config.get("drive", {})
    year = recording.start.strftime("%Y")
    month = recording.start.strftime("%Y-%m")

    if decision.route is Route.REVIEW:
        return [sanitise(drive_cfg.get("review_folder", "_Review")), month]

    if decision.route is Route.AUDIO_ONLY:
        return [sanitise(drive_cfg.get("unsorted_folder", "_Unsorted")), month]

    chapter_folder = resolve_chapter_folder(
        decision.subject,
        decision.form,
        decision.chapter,
        config.get("syllabus", {}) or {},
    )
    return [
        sanitise(decision.subject or "Unsorted-Subject"),
        sanitise(decision.form or "Unsorted-Form"),
        year,
        sanitise(chapter_folder),
    ]
