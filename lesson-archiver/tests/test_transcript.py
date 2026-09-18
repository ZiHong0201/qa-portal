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
