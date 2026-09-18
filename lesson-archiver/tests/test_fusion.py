from datetime import datetime, timedelta, timezone

from archiver.fusion import decide
from archiver.models import (
    CalendarEvent, Classification, MatchResult, Route, ZoomRecording,
)

KL = timezone(timedelta(hours=8))
WATCH = [{"subject": "Physics", "form": "Form 5"}]
SUBJECTS = ["Physics", "Additional Mathematics"]


def at(hour, minute=0):
    return datetime(2026, 9, 17, hour, minute, tzinfo=KL)


REC = ZoomRecording(
    uuid="abc==", meeting_id="1", topic="Lesson",
    start=at(16, 5), duration_minutes=80,
)


def matched(title="Physics F5 - Ch3 Electricity", ambiguous=False):
    ev = CalendarEvent.from_raw("e1", title, at(16), at(17, 30), known_subjects=SUBJECTS)
    runner = CalendarEvent.from_raw("e2", "Physics F4 - Ch2", at(17), at(18), known_subjects=SUBJECTS)
    return MatchResult(
        event=ev, score=1.0, ambiguous=ambiguous,
        runner_up=runner if ambiguous else None,
        runner_up_score=0.95 if ambiguous else 0.0,
    )


def cls(subject="Physics", form="Form 5", chapter="Ch03", conf=0.93, academic=True):
    return Classification(
        subject=subject, form=form, chapter=chapter,
        confidence=conf, is_academic=academic,
    )


def run(match, classification, **kw):
    return decide(REC, match, classification, watch=WATCH, **kw)


def test_agreement_files_automatically():
    d = run(matched(), cls())
    assert d.route is Route.ARCHIVE
    assert (d.subject, d.form, d.chapter) == ("Physics", "Form 5", "Ch03")
    assert d.is_watched
    assert d.divergence is None


def test_chapter_divergence_prefers_what_was_actually_taught():
    # You ran over from last week: the transcript wins, and it is reported.
    d = run(matched(), cls(chapter="Ch04"))
    assert d.route is Route.ARCHIVE
    assert d.chapter == "Ch04"
    assert "Ch03" in d.divergence and "Ch04" in d.divergence


def test_subject_disagreement_goes_to_review():
    d = run(matched(), cls(subject="Additional Mathematics"))
    assert d.route is Route.REVIEW
    assert d.confidence <= 0.5


def test_ambiguous_match_goes_to_review():
    d = run(matched(ambiguous=True), cls())
    assert d.route is Route.REVIEW
    assert "ambiguous" in d.reason


def test_classifier_failure_still_files_on_calendar_alone():
    # The classifier is a verifier, not a gate. Losing it must not stall filing.
    d = run(matched(), None)
    assert d.route is Route.ARCHIVE
    assert d.chapter == "Ch03"
    assert d.confidence == 0.80


def test_unscheduled_but_confident_lesson_is_archived():
    d = run(MatchResult(), cls(conf=0.91))
    assert d.route is Route.ARCHIVE
    assert "unscheduled" in " ".join(d.notes)


def test_unscheduled_middling_confidence_goes_to_review():
    d = run(MatchResult(), cls(conf=0.70))
    assert d.route is Route.REVIEW


def test_staff_meeting_never_downloads_video():
    # The largest storage saving in the system: no event, no academic content.
    d = run(MatchResult(), cls(subject=None, chapter=None, conf=0.2, academic=False))
    assert d.route is Route.AUDIO_ONLY


def test_low_confidence_no_match_is_audio_only():
    d = run(MatchResult(), cls(conf=0.3))
    assert d.route is Route.AUDIO_ONLY


def test_other_subject_is_archived_but_not_watched():
    m = matched("Additional Mathematics F4 - Ch2 Quadratics")
    d = run(m, cls(subject="Additional Mathematics", form="Form 4", chapter="Ch02"))
    assert d.route is Route.ARCHIVE
    assert not d.is_watched


def test_video_for_watched_only_downgrades_other_subjects():
    m = matched("Additional Mathematics F4 - Ch2 Quadratics")
    d = run(
        m,
        cls(subject="Additional Mathematics", form="Form 4", chapter="Ch02"),
        video_for_watched_only=True,
    )
    assert d.route is Route.AUDIO_ONLY
    d2 = run(matched(), cls(), video_for_watched_only=True)
    assert d2.route is Route.ARCHIVE
