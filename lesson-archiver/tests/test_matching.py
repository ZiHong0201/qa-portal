from datetime import datetime, timedelta, timezone

from archiver.matching import match_recording, overlap_score
from archiver.models import CalendarEvent, ZoomRecording

KL = timezone(timedelta(hours=8))
SUBJECTS = ["Physics", "Additional Mathematics"]


def at(hour, minute=0, day=17):
    return datetime(2026, 9, day, hour, minute, tzinfo=KL)


def event(title, start, end, uid="e1"):
    return CalendarEvent.from_raw(uid, title, start, end, known_subjects=SUBJECTS)


def recording(start, minutes):
    return ZoomRecording(
        uuid="abc==", meeting_id="1", topic="Lesson",
        start=start, duration_minutes=minutes,
    )


def test_short_recording_inside_long_slot_scores_full():
    # Starting late and stopping early is the normal case, not a weak match.
    score = overlap_score(at(16, 10), at(17, 20), at(16), at(17, 30))
    assert score == 1.0


def test_no_overlap_scores_zero():
    assert overlap_score(at(20), at(21), at(16), at(17, 30)) == 0.0


def test_lesson_running_over_still_matches_via_tolerance():
    score = overlap_score(at(17, 25), at(17, 45), at(16), at(17, 30), tolerance_minutes=20)
    assert score > 0.9


def test_picks_the_overlapping_lesson():
    events = [
        event("Physics F5 - Ch3 Electricity", at(16), at(17, 30), uid="a"),
        event("Physics F4 - Ch2 Force", at(9), at(10, 30), uid="b"),
    ]
    result = match_recording(recording(at(16, 5), 80), events)
    assert result.matched
    assert result.event.uid == "a"
    assert result.event.form == "Form 5"
    assert result.event.chapter == "Ch03"
    assert result.event.subject == "Physics"


def test_back_to_back_lessons_are_flagged_ambiguous():
    # A recording spanning both slots must not silently pick one.
    events = [
        event("Physics F5 - Ch3", at(16), at(17), uid="a"),
        event("Physics F4 - Ch2", at(17), at(18), uid="b"),
    ]
    result = match_recording(recording(at(16, 30), 60), events)
    assert result.ambiguous
    assert not result.matched


def test_all_day_events_are_ignored():
    events = [event("Public Holiday", at(0), at(0, day=18), uid="h")]
    assert match_recording(recording(at(16), 60), events).event is None


def test_no_events_returns_empty_match():
    assert not match_recording(recording(at(16), 60), []).matched


def test_malay_title_tokens_are_parsed():
    ev = event("Fizik Tingkatan 5 - Bab 4 Elektronik", at(16), at(17, 30))
    assert ev.form == "Form 5"
    assert ev.chapter == "Ch04"
