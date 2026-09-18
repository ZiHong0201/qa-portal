"""Ask Claude what was actually taught.

With the calendar supplying declared ground truth, this is a verification step
rather than an open classification: Claude is handed what was scheduled and
asked whether the transcript agrees. That makes the task easy, the prompt
short, and a failure recoverable - if this step cannot run, `fusion` still
files the lesson on calendar evidence alone rather than stalling.

Two backends:
  api         - Anthropic API key, works unattended
  claude-code - shells out to `claude -p`, using a Claude subscription instead
                of API billing, at the cost of requiring the CLI to be logged in
"""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

from .models import CalendarEvent, Classification, normalise_chapter, normalise_form

log = logging.getLogger(__name__)

TOOL_NAME = "record_lesson_classification"

TOOL_SCHEMA = {
    "name": TOOL_NAME,
    "description": "Record what subject, form and chapter this lesson recording covers.",
    "strict": True,
    "input_schema": {
        "type": "object",
        "properties": {
            "is_academic": {
                "type": "boolean",
                "description": "True if this is a taught lesson. False for staff meetings, parent calls, admin discussions or idle recordings.",
            },
            "subject": {
                "type": ["string", "null"],
                "description": "Subject taught, e.g. 'Physics'. Null if not a lesson or not determinable.",
            },
            "form": {
                "type": ["string", "null"],
                "description": "Year level as 'Form 1' to 'Form 6', or null if not determinable.",
            },
            "chapter": {
                "type": ["string", "null"],
                "description": "Chapter key in the form 'ChNN', e.g. 'Ch03'. Null if not determinable.",
            },
            "confidence": {
                "type": "number",
                "description": "Confidence from 0.0 to 1.0 in the subject and form above.",
            },
            "agrees_with_calendar": {
                "type": ["boolean", "null"],
                "description": "Whether this matches the scheduled lesson supplied. Null if nothing was scheduled.",
            },
            "summary": {
                "type": "string",
                "description": "One sentence, under 25 words, on what was actually covered.",
            },
        },
        "required": [
            "is_academic", "subject", "form", "chapter",
            "confidence", "agrees_with_calendar", "summary",
        ],
        "additionalProperties": False,
    },
}

SYSTEM = """You identify secondary-school lesson recordings for a Malaysian teacher's archive.

You are given what was scheduled in the teacher's calendar, the Zoom meeting topic, and a sampled transcript of the recording. The transcript is machine-generated and may contain errors, code-switching between English and Bahasa Melayu, and classroom chatter.

Your task is verification, not guesswork. When a scheduled lesson is supplied, decide whether the transcript is consistent with it. Teachers routinely overrun into the next chapter or swap a lesson at short notice, so a subject that matches while the chapter differs is normal and should be reported as such, with the chapter you actually heard.

Be honest about uncertainty. A short, noisy or off-topic transcript should get low confidence rather than a plausible guess - low confidence routes the lesson for human review, which is cheap, while a confident wrong answer misfiles it silently.

Always call the record_lesson_classification tool exactly once."""


def _build_prompt(
    zoom_topic: str,
    event: Optional[CalendarEvent],
    transcript_sample: str,
    syllabus: dict,
) -> str:
    sections = []

    if event:
        sections.append(
            "SCHEDULED IN CALENDAR:\n"
            f"  Title:   {event.title}\n"
            f"  When:    {event.start.isoformat()} to {event.end.isoformat()}\n"
            f"  Parsed:  subject={event.subject!r} form={event.form!r} chapter={event.chapter!r}"
            + (f"\n  Notes:   {event.notes[:500]}" if event.notes else "")
        )
    else:
        sections.append(
            "SCHEDULED IN CALENDAR:\n  Nothing scheduled at this time. Identify the "
            "recording from the transcript alone, and set agrees_with_calendar to null."
        )

    sections.append(f"ZOOM MEETING TOPIC:\n  {zoom_topic or '(none)'}")

    if syllabus:
        lines = []
        for subject, forms in syllabus.items():
            for form, chapters in (forms or {}).items():
                lines.append(f"  {subject} / {form}: {', '.join(chapters)}")
        if lines:
            sections.append(
                "KNOWN SYLLABUS (use these chapter numbers where one fits; if the "
                "content does not match any listed chapter, return null for chapter):\n"
                + "\n".join(lines)
            )

    sections.append(
        "TRANSCRIPT SAMPLE (opening stretch, then evenly spaced probes):\n"
        + (transcript_sample or "(no transcript available)")
    )

    return "\n\n".join(sections)


def _to_classification(payload: dict) -> Classification:
    """Normalise the model's answer into canonical form values."""
    try:
        confidence = float(payload.get("confidence") or 0.0)
    except (TypeError, ValueError):
        confidence = 0.0

    return Classification(
        subject=(payload.get("subject") or None),
        form=normalise_form(payload.get("form")) or None,
        chapter=normalise_chapter(payload.get("chapter")) or None,
        confidence=max(0.0, min(1.0, confidence)),
        summary=(payload.get("summary") or "")[:300],
        is_academic=bool(payload.get("is_academic", True)),
        agrees_with_calendar=payload.get("agrees_with_calendar"),
    )


def classify(
    zoom_topic: str,
    event: Optional[CalendarEvent],
    transcript_sample: str,
    syllabus: dict,
    *,
    backend: str = "claude-code",
    model: str = "claude-opus-5",
) -> Optional[Classification]:
    """Classify a lesson, or return None if the classifier could not run.

    None is a supported outcome, not an error: the caller falls back to
    calendar-only routing, which is a good answer on its own.
    """
    if not transcript_sample and event is None:
        return None

    prompt = _build_prompt(zoom_topic, event, transcript_sample, syllabus)
    try:
        if backend == "claude-code":
            return _classify_via_claude_code(prompt, model)
        return _classify_via_api(prompt, model)
    except Exception as exc:
        log.warning("Classification failed (%s); falling back to calendar only", exc)
        return None


def _classify_via_api(prompt: str, model: str) -> Optional[Classification]:
    import anthropic

    client = anthropic.Anthropic()

    # tool_choice is left on "auto" rather than forcing the tool: forcing is
    # rejected alongside thinking on some models, and the system prompt already
    # instructs a single tool call. A missing call degrades to None.
    request = {
        "model": model,
        "max_tokens": 2000,
        "system": SYSTEM,
        "tools": [TOOL_SCHEMA],
        "messages": [{"role": "user", "content": prompt}],
    }

    try:
        response = client.messages.create(**request, output_config={"effort": "low"})
    except TypeError:
        # Older SDK without output_config; effort is an optimisation, not a need.
        response = client.messages.create(**request)

    if getattr(response, "stop_reason", None) == "refusal":
        log.warning("Classifier refused; falling back to calendar only")
        return None

    for block in response.content:
        if getattr(block, "type", None) == "tool_use" and block.name == TOOL_NAME:
            return _to_classification(dict(block.input))

    log.warning("No tool call in classifier response; falling back to calendar only")
    return None


# launchd runs jobs with a minimal PATH, so the CLI's default install location
# under the user's home directory is not on it. Checking the known locations
# keeps scheduled runs behaving the same as runs from your own shell.
CLAUDE_SEARCH_PATHS = [
    "~/.local/bin/claude",        # native installer (claude.ai/install.sh)
    "/opt/homebrew/bin/claude",   # Homebrew, Apple silicon
    "/usr/local/bin/claude",      # Homebrew, Intel
]


def find_claude_binary() -> Optional[str]:
    """Locate the Claude Code CLI, PATH first, then the usual install sites."""
    override = os.environ.get("CLAUDE_BINARY", "").strip()
    if override:
        return override if Path(override).expanduser().is_file() else None

    found = shutil.which("claude")
    if found:
        return found

    for candidate in CLAUDE_SEARCH_PATHS:
        path = Path(candidate).expanduser()
        if path.is_file():
            return str(path)
    return None


def _extract_json_object(text: str) -> Optional[dict]:
    """Pull the classification object out of the CLI's output.

    With --output-format json the CLI wraps the answer in a result envelope, so
    a naive greedy brace match would return the envelope rather than the
    classification. Unwrap first, then look inside; fall back to a direct parse
    for plain-text output.
    """
    for candidate in (text, ""):
        if not candidate:
            break
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            break
        if isinstance(parsed, dict) and "is_academic" in parsed:
            return parsed
        if isinstance(parsed, dict) and isinstance(parsed.get("result"), str):
            text = parsed["result"]
            break

    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _classify_via_claude_code(prompt: str, model: str) -> Optional[Classification]:
    """Use the Claude Code CLI so a Claude subscription covers the cost.

    Requires `claude` on PATH and already logged in as the user running this
    agent, which is why it only works for a local, interactive-account setup.
    """
    binary = find_claude_binary()
    if not binary:
        log.warning(
            "classify.backend is 'claude-code' but the `claude` CLI was not found. "
            "Install it from https://claude.ai/install.sh, or set "
            "CLAUDE_BINARY to its full path."
        )
        return None

    schema_hint = json.dumps(TOOL_SCHEMA["input_schema"]["properties"], indent=2)
    full_prompt = (
        f"{SYSTEM}\n\n{prompt}\n\n"
        "Reply with a single JSON object and nothing else - no prose, no code "
        f"fence. Use exactly these keys:\n{schema_hint}"
    )

    # Run from an empty directory. The CLI loads CLAUDE.md and AGENTS.md from
    # its working directory, and this package lives inside a repo that has
    # both - inheriting them would prepend unrelated project instructions to
    # every classification and quietly inflate the prompt.
    scratch = tempfile.mkdtemp(prefix="lesson-archiver-classify-")
    try:
        # Drop ANTHROPIC_API_KEY from the child environment. A key that is
        # present - even empty - makes the CLI authenticate as an API caller
        # rather than with the subscription this backend exists to use.
        env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_API_KEY"}
        result = subprocess.run(
            [binary, "-p", full_prompt, "--model", model, "--output-format", "json"],
            capture_output=True, text=True, timeout=300, cwd=scratch, env=env,
        )
    except subprocess.TimeoutExpired:
        log.warning("claude CLI timed out after 300s")
        return None
    finally:
        shutil.rmtree(scratch, ignore_errors=True)

    if result.returncode != 0:
        log.warning("claude CLI exited %s: %s", result.returncode, result.stderr[:300])
        return None

    payload = _extract_json_object(result.stdout)
    if payload is None:
        log.warning("No classification object in claude CLI output")
        return None
    return _to_classification(payload)
