from datetime import datetime, timedelta, timezone

from archiver.models import Decision, Route, ZoomRecording
from archiver.naming import (
    build_filename, build_folder_path, resolve_chapter_folder, sanitise, subject_code,
)

KL = timezone(timedelta(hours=8))
REC = ZoomRecording(
    uuid="abc==", meeting_id="1", topic="My Meeting",
    start=datetime(2026, 9, 17, 16, 0, tzinfo=KL), duration_minutes=90,
)
CONFIG = {
    "drive": {"review_folder": "_Review", "unsorted_folder": "_Unsorted"},
    "syllabus": {
        "Physics": {"Form 5": ["Ch03 - Electricity and Magnetism", "Ch04 - Electronics"]}
    },
}


def archived(chapter="Ch03"):
    return Decision(
        route=Route.ARCHIVE, subject="Physics", form="Form 5",
        chapter=chapter, confidence=0.95,
    )


def test_filename_is_deterministic_and_readable():
    assert build_filename(REC, archived()) == "PHY-F5_Ch03_2026-09-17_1600.mp4"


def test_filename_ignores_the_zoom_topic():
    # Naming from the decision, not the meeting topic, keeps re-runs idempotent.
    a = build_filename(REC, archived())
    renamed = ZoomRecording(**{**REC.__dict__, "topic": "totally different topic"})
    assert build_filename(renamed, archived()) == a


def test_archive_path_expands_chapter_from_syllabus():
    assert build_folder_path(REC, archived(), CONFIG) == [
        "Physics", "Form 5", "2026", "Ch03 - Electricity and Magnetism",
    ]


def test_unknown_chapter_files_under_its_own_key_not_an_error():
    assert resolve_chapter_folder("Physics", "Form 5", "Ch09", CONFIG["syllabus"]) == "Ch09"


def test_missing_chapter_has_a_home():
    assert build_folder_path(REC, archived(chapter=None), CONFIG)[-1] == "Unsorted-Chapter"


def test_review_and_unsorted_are_dated_buckets():
    review = Decision(route=Route.REVIEW, subject="Physics", form="Form 5")
    assert build_folder_path(REC, review, CONFIG) == ["_Review", "2026-09"]
    audio = Decision(route=Route.AUDIO_ONLY)
    assert build_folder_path(REC, audio, CONFIG) == ["_Unsorted", "2026-09"]


def test_sanitise_strips_path_separators():
    assert "/" not in sanitise("Physics / Form 5")
    assert sanitise("") == "Unnamed"
    assert len(sanitise("x" * 400)) <= 120


def test_subject_code_handles_short_and_missing_subjects():
    assert subject_code("Physics") == "PHY"
    assert subject_code(None) == "GEN"
    assert len(subject_code("Ar")) == 3
