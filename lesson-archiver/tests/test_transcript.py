from archiver.classify import _build_prompt, _to_classification
from archiver.transcript import parse_vtt

VTT = """WEBVTT

1
00:00:01.000 --> 00:00:06.000
Teacher Lim: Good morning class, today we continue Chapter 3, electricity.

2
00:00:06.500 --> 00:00:11.000
Teacher Lim: Remember last week we finished force and motion.

3
00:20:00.000 --> 00:20:05.000
Teacher Lim: So current is measured in amperes.

4
01:10:00.000 --> 01:10:04.000
Teacher Lim: That is all for today, do exercise 3.2.
"""


def test_parse_vtt_extracts_cues_with_timings():
    t = parse_vtt(VTT)
    assert t.source == "zoom-vtt"
    assert len(t.cues) == 4
    assert t.cues[0].start_seconds == 1.0
    assert t.cues[2].start_seconds == 1200.0
    assert "amperes" in t.full_text


def test_empty_vtt_is_marked_unusable():
    t = parse_vtt("WEBVTT\n\n")
    assert not t.usable
    assert t.source == "empty"


def test_sample_keeps_opening_and_probes_the_rest():
    sample = parse_vtt(VTT).sample(head_minutes=10, chunk_count=2, chunk_minutes=2)
    # Opening establishes subject and chapter, so it must always survive.
    assert "Chapter 3" in sample
    assert sample.startswith("[00:00]")
    # And the sample must be materially shorter than the whole transcript.
    assert len(sample) < len(parse_vtt(VTT).full_text) + 200


def test_sample_of_empty_transcript_is_empty():
    assert parse_vtt("WEBVTT\n").sample() == ""


def test_classification_normalises_loose_model_output():
    c = _to_classification({
        "is_academic": True, "subject": "Physics", "form": "F5",
        "chapter": "Chapter 3", "confidence": 1.4, "summary": "x" * 500,
        "agrees_with_calendar": True,
    })
    assert c.form == "Form 5"        # "F5" -> canonical
    assert c.chapter == "Ch03"       # "Chapter 3" -> zero-padded key
    assert c.confidence == 1.0       # clamped
    assert len(c.summary) <= 300


def test_classification_survives_garbage_confidence():
    c = _to_classification({"confidence": "not a number", "subject": None})
    assert c.confidence == 0.0
    assert c.subject is None


def test_prompt_states_plainly_when_nothing_was_scheduled():
    prompt = _build_prompt("Some meeting", None, "hello", {})
    assert "Nothing scheduled" in prompt
    assert "agrees_with_calendar to null" in prompt


# --- claude-code backend output parsing -----------------------------------
from archiver.classify import _extract_json_object

CLASSIFICATION = (
    '{"is_academic": true, "subject": "Physics", "form": "Form 5", '
    '"chapter": "Ch03", "confidence": 0.93, "agrees_with_calendar": true, '
    '"summary": "Series and parallel circuits."}'
)


def test_extracts_from_cli_json_envelope():
    # --output-format json wraps the answer; a greedy brace match would
    # return the envelope instead of the classification inside it.
    envelope = '{"type": "result", "is_error": false, "result": %s}' % repr(CLASSIFICATION).replace("'", '"')
    import json as _json
    envelope = _json.dumps({"type": "result", "is_error": False, "result": CLASSIFICATION})
    assert _extract_json_object(envelope)["subject"] == "Physics"


def test_extracts_from_bare_json():
    assert _extract_json_object(CLASSIFICATION)["chapter"] == "Ch03"


def test_extracts_when_wrapped_in_prose_or_fences():
    noisy = f"Here is the result:\n```json\n{CLASSIFICATION}\n```\nHope that helps."
    assert _extract_json_object(noisy)["form"] == "Form 5"


def test_returns_none_when_there_is_no_object():
    assert _extract_json_object("I could not determine the subject.") is None
    assert _extract_json_object("") is None


def test_returns_none_on_malformed_json():
    assert _extract_json_object("{not valid json at all,,,}") is None


# --- credential isolation for the claude-code backend ---------------------
def test_blank_env_values_are_not_exported(tmp_path, monkeypatch):
    """The .env template ships every key present but empty.

    An empty-but-set ANTHROPIC_API_KEY makes the Claude Code CLI authenticate
    as an API caller instead of using the subscription login, which is the
    whole point of the claude-code backend.
    """
    from archiver.config import load_dotenv

    env_file = tmp_path / ".env"
    env_file.write_text("ANTHROPIC_API_KEY=\nZOOM_CLIENT_ID=real-value\n")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("ZOOM_CLIENT_ID", raising=False)

    load_dotenv(env_file)

    import os
    assert "ANTHROPIC_API_KEY" not in os.environ
    assert os.environ["ZOOM_CLIENT_ID"] == "real-value"


def test_claude_binary_found_outside_path(tmp_path, monkeypatch):
    """launchd's minimal PATH excludes ~/.local/bin, where the CLI installs."""
    from archiver import classify as classify_mod

    fake = tmp_path / "claude"
    fake.write_text("#!/bin/sh\n")
    fake.chmod(0o755)

    monkeypatch.delenv("CLAUDE_BINARY", raising=False)
    monkeypatch.setattr(classify_mod.shutil, "which", lambda name: None)
    monkeypatch.setattr(classify_mod, "CLAUDE_SEARCH_PATHS", [str(fake)])

    assert classify_mod.find_claude_binary() == str(fake)


def test_claude_binary_override_is_honoured(tmp_path, monkeypatch):
    from archiver import classify as classify_mod

    fake = tmp_path / "claude-custom"
    fake.write_text("#!/bin/sh\n")
    monkeypatch.setenv("CLAUDE_BINARY", str(fake))
    assert classify_mod.find_claude_binary() == str(fake)

    monkeypatch.setenv("CLAUDE_BINARY", str(tmp_path / "does-not-exist"))
    assert classify_mod.find_claude_binary() is None
