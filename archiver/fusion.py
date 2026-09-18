"""Reconcile the calendar against what Claude heard in the transcript.

The agreements are uninteresting. The value of this module is in the
principled handling of the ways teaching diverges from planning: you run over
from last week, you swap a lesson, you hold an unscheduled replacement class.
Each of those has a different correct answer, and guessing wrong either
misfiles a lesson or buries it in a review queue nobody reads.
"""

from __future__ import annotations

from typing import Optional

from .models import Classification, Decision, MatchResult, Route, ZoomRecording


def _is_watched(subject: Optional[str], form: Optional[str], watch: list[dict]) -> bool:
    return any(
        (row.get("subject") or "").lower() == (subject or "").lower()
        and (row.get("form") or "").lower() == (form or "").lower()
        for row in watch
    )


def decide(
    recording: ZoomRecording,
    match: MatchResult,
    classification: Optional[Classification],
    *,
    watch: list[dict],
    auto_file_threshold: float = 0.85,
    review_threshold: float = 0.60,
    video_for_watched_only: bool = False,
) -> Decision:
    """Fuse calendar and transcript into a single routing decision."""
    decision = _decide_inner(
        recording,
        match,
        classification,
        watch=watch,
        auto_file_threshold=auto_file_threshold,
        review_threshold=review_threshold,
    )

    decision.is_watched = _is_watched(decision.subject, decision.form, watch)

    # Optional storage guard: only fetch video for the subjects being watched.
    if (
        video_for_watched_only
        and decision.route is Route.ARCHIVE
        and not decision.is_watched
    ):
        decision.route = Route.AUDIO_ONLY
        decision.notes.append(
            "video skipped: video_for_watched_only is on and this is not a watched subject"
        )

    return decision


def _decide_inner(
    recording: ZoomRecording,
    match: MatchResult,
    cls: Optional[Classification],
    *,
    watch: list[dict],
    auto_file_threshold: float,
    review_threshold: float,
) -> Decision:
    # A recording with no teaching event behind it and no academic content is
    # a staff meeting or a parent call. Never spend storage on the video.
    if cls is not None and not cls.is_academic and not match.matched:
        return Decision(
            route=Route.AUDIO_ONLY,
            confidence=cls.confidence,
            reason="no calendar event and no academic content detected",
        )

    # --- Ambiguous calendar match: two lessons back to back -----------------
    if match.event is not None and match.ambiguous:
        event = match.event
        return Decision(
            route=Route.REVIEW,
            subject=event.subject,
            form=event.form,
            chapter=event.chapter,
            confidence=min(match.score, 0.5),
            reason=(
                f"ambiguous calendar match: '{event.title}' and "
                f"'{match.runner_up.title if match.runner_up else '?'}' score within "
                f"{abs(match.score - match.runner_up_score):.2f}"
            ),
        )

    # --- Clean calendar match ----------------------------------------------
    if match.matched and match.event is not None:
        event = match.event

        # Classifier unavailable (API down, refusal, empty transcript). The
        # calendar alone is still a good answer, so degrade rather than stall.
        if cls is None:
            return Decision(
                route=Route.ARCHIVE,
                subject=event.subject,
                form=event.form,
                chapter=event.chapter,
                confidence=0.80,
                reason="calendar match; transcript verification unavailable",
                notes=["classifier did not run - filed on calendar evidence alone"],
            )

        same_subject = (cls.subject or "").lower() == (event.subject or "").lower()

        if not same_subject and cls.subject:
            return Decision(
                route=Route.REVIEW,
                subject=event.subject,
                form=event.form,
                chapter=event.chapter,
                confidence=min(cls.confidence, 0.5),
                reason=(
                    f"calendar says {event.subject}, transcript reads as {cls.subject}"
                ),
                notes=["subject disagreement - check before filing"],
            )

        # Same subject. What was taught outranks what was planned, so when the
        # chapter differs the transcript wins and the divergence is reported.
        divergence = None
        chapter = event.chapter or cls.chapter
        if cls.chapter and event.chapter and cls.chapter != event.chapter:
            chapter = cls.chapter
            divergence = f"scheduled {event.chapter}, taught {cls.chapter}"
        elif cls.chapter and not event.chapter:
            chapter = cls.chapter

        return Decision(
            route=Route.ARCHIVE,
            subject=event.subject or cls.subject,
            form=event.form or cls.form,
            chapter=chapter,
            confidence=max(cls.confidence, 0.85),
            reason="calendar match confirmed by transcript",
            divergence=divergence,
        )

    # --- No calendar match --------------------------------------------------
    if cls is None or not cls.subject or not cls.is_academic:
        return Decision(
            route=Route.AUDIO_ONLY,
            confidence=cls.confidence if cls else 0.0,
            reason="no calendar event and nothing identifiable in the transcript",
        )

    if cls.confidence >= auto_file_threshold:
        return Decision(
            route=Route.ARCHIVE,
            subject=cls.subject,
            form=cls.form,
            chapter=cls.chapter,
            confidence=cls.confidence,
            reason="no calendar event; filed on transcript alone",
            notes=["unscheduled lesson - not in your Teaching calendar"],
        )

    if cls.confidence >= review_threshold:
        return Decision(
            route=Route.REVIEW,
            subject=cls.subject,
            form=cls.form,
            chapter=cls.chapter,
            confidence=cls.confidence,
            reason="no calendar event and transcript confidence is middling",
        )

    return Decision(
        route=Route.AUDIO_ONLY,
        subject=cls.subject,
        form=cls.form,
        confidence=cls.confidence,
        reason="no calendar event and low transcript confidence",
    )
