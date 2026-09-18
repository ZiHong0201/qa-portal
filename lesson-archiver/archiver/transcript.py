"""Get text out of a lesson, cheaply.

Zoom already produces a VTT transcript for cloud recordings at no extra cost,
so that is the primary source. Local Whisper is the fallback for when it is
missing or unusable - which is the realistic case for lessons delivered in a
Malay/English mix, where Zoom's transcription degrades.

The sampler matters as much as the source. A 90-minute lesson is roughly
18,000 tokens of transcript, but the subject, form and chapter are all
established in the opening minutes and reinforced throughout. Sending the
opening plus a few evenly spaced probes captures the same signal at about a
fifth of the tokens.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class TranscriptCue:
    start_seconds: float
    text: str


@dataclass
class Transcript:
    cues: list[TranscriptCue]
    source: str  # "zoom-vtt" | "whisper" | "empty"

    @property
    def full_text(self) -> str:
        return " ".join(cue.text for cue in self.cues).strip()

    @property
    def usable(self) -> bool:
        return len(self.full_text) > 0

    def sample(
        self, head_minutes: int = 10, chunk_count: int = 3, chunk_minutes: int = 2
    ) -> str:
        """Opening stretch plus evenly spaced probes from the remainder."""
        if not self.cues:
            return ""

        head_cutoff = head_minutes * 60
        head = [c for c in self.cues if c.start_seconds < head_cutoff]
        tail = [c for c in self.cues if c.start_seconds >= head_cutoff]

        parts = [f"[00:00] {' '.join(c.text for c in head)}".strip()]

        if tail and chunk_count > 0:
            span_start = tail[0].start_seconds
            span_end = tail[-1].start_seconds
            if span_end > span_start:
                step = (span_end - span_start) / (chunk_count + 1)
                for index in range(1, chunk_count + 1):
                    probe = span_start + step * index
                    window = [
                        c for c in tail
                        if probe <= c.start_seconds < probe + chunk_minutes * 60
                    ]
                    if window:
                        stamp = _stamp(window[0].start_seconds)
                        parts.append(f"[{stamp}] {' '.join(c.text for c in window)}")

        return "\n\n".join(p for p in parts if p.strip())


def _stamp(seconds: float) -> str:
    return f"{int(seconds // 3600):02d}:{int(seconds % 3600 // 60):02d}"


def _vtt_timestamp_to_seconds(value: str) -> float:
    parts = value.replace(",", ".").split(":")
    try:
        numbers = [float(p) for p in parts]
    except ValueError:
        return 0.0
    if len(numbers) == 3:
        return numbers[0] * 3600 + numbers[1] * 60 + numbers[2]
    if len(numbers) == 2:
        return numbers[0] * 60 + numbers[1]
    return numbers[0] if numbers else 0.0


_CUE_RE = re.compile(
    r"(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{0,3})\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{0,3})"
)


def parse_vtt(text: str) -> Transcript:
    """Parse WebVTT without a hard dependency on a VTT library.

    Zoom's VTT is plain and regular, and a self-contained parser removes a
    dependency that would otherwise have to be installed on the Mac.
    """
    cues: list[TranscriptCue] = []
    current_start: Optional[float] = None
    buffer: list[str] = []

    for raw in text.splitlines():
        line = raw.strip()
        match = _CUE_RE.search(line)
        if match:
            if current_start is not None and buffer:
                cues.append(TranscriptCue(current_start, " ".join(buffer)))
            current_start = _vtt_timestamp_to_seconds(match.group(1))
            buffer = []
            continue
        if not line or line == "WEBVTT" or line.isdigit():
            continue
        if line.startswith(("NOTE", "STYLE", "REGION")):
            continue
        # Zoom prefixes cue text with the speaker name; keep it, it is context.
        buffer.append(line)

    if current_start is not None and buffer:
        cues.append(TranscriptCue(current_start, " ".join(buffer)))

    return Transcript(cues=cues, source="zoom-vtt" if cues else "empty")


def load_transcript(
    vtt_path: Optional[Path],
    audio_path: Optional[Path],
    *,
    min_usable_chars: int = 400,
    whisper_fallback: bool = True,
    whisper_model: str = "small",
) -> Transcript:
    """Zoom's VTT if it is good enough, otherwise local Whisper."""
    if vtt_path and vtt_path.exists():
        transcript = parse_vtt(vtt_path.read_text(encoding="utf-8", errors="replace"))
        if len(transcript.full_text) >= min_usable_chars:
            return transcript
        log.info(
            "Zoom transcript is only %d chars (threshold %d); falling back",
            len(transcript.full_text), min_usable_chars,
        )

    if whisper_fallback and audio_path and audio_path.exists():
        transcribed = _whisper(audio_path, whisper_model)
        if transcribed is not None:
            return transcribed

    return Transcript(cues=[], source="empty")


def _whisper(audio_path: Path, model_size: str) -> Optional[Transcript]:
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        log.warning(
            "faster-whisper is not installed, so there is no transcript fallback. "
            "Install it with: pip install faster-whisper"
        )
        return None

    try:
        log.info("Transcribing %s locally with Whisper (%s)", audio_path.name, model_size)
        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        segments, _info = model.transcribe(str(audio_path), vad_filter=True)
        cues = [TranscriptCue(seg.start, seg.text.strip()) for seg in segments]
        return Transcript(cues=cues, source="whisper") if cues else None
    except Exception as exc:
        log.warning("Local transcription failed: %s", exc)
        return None
