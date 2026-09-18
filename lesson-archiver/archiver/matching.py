"""Join a Zoom recording to the calendar event it belongs to.

This is a deterministic temporal join, not an inference. The calendar is the
declared ground truth: if the schedule says Physics Form 5 at 16:00, a
recording that overlaps that window is that lesson.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Iterable

from .models import CalendarEvent, MatchResult, ZoomRecording


def overlap_score(
    rec_start, rec_end, ev_start, ev_end, tolerance_minutes: int = 20
) -> float:
    """Score how well a recording window sits inside an event window.

    Containment rather than Jaccard: a recording is routinely much shorter
    than the scheduled slot (you start recording late, stop before the bell),
    and intersection-over-union would punish that correct match heavily.
    Dividing by the shorter of the two spans keeps a 40-minute recording
    inside a 90-minute lesson at a score of 1.0.

    The event window is widened by `tolerance_minutes` on each side so a
    lesson that runs over still matches its own slot.
    """
    pad = timedelta(minutes=tolerance_minutes)
    window_start = ev_start - pad
    window_end = ev_end + pad

    intersection = min(rec_end, window_end) - max(rec_start, window_start)
    if intersection <= timedelta(0):
        return 0.0

    shortest = min(rec_end - rec_start, ev_end - ev_start)
    if shortest <= timedelta(0):
        return 0.0

    return min(1.0, intersection.total_seconds() / shortest.total_seconds())


def match_recording(
    recording: ZoomRecording,
    events: Iterable[CalendarEvent],
    tolerance_minutes: int = 20,
    ambiguity_margin: float = 0.10,
) -> MatchResult:
    """Pick the calendar event a recording belongs to.

    Back-to-back lessons are the main ambiguity source, so when the two best
    candidates score within `ambiguity_margin` of each other the match is
    reported ambiguous and the caller routes for review rather than guessing.
    """
    scored: list[tuple[float, CalendarEvent]] = []
    for event in events:
        if event.is_all_day:
            continue
        score = overlap_score(
            recording.start,
            recording.end,
            event.start,
            event.end,
            tolerance_minutes,
        )
        if score > 0:
            scored.append((score, event))

    if not scored:
        return MatchResult()

    # Sort by score, then by closeness of start time so ties are deterministic.
    scored.sort(
        key=lambda pair: (
            -pair[0],
            abs((pair[1].start - recording.start).total_seconds()),
        )
    )

    best_score, best_event = scored[0]
    if len(scored) == 1:
        return MatchResult(event=best_event, score=best_score)

    runner_score, runner_event = scored[1]
    ambiguous = (best_score - runner_score) <= ambiguity_margin
    return MatchResult(
        event=best_event,
        score=best_score,
        ambiguous=ambiguous,
        runner_up=runner_event,
        runner_up_score=runner_score,
    )
