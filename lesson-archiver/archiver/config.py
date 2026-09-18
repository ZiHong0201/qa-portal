"""Configuration loading: config.yaml for behaviour, .env for secrets."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional

import yaml

DEFAULT_CONFIG = Path(__file__).resolve().parents[1] / "config.yaml"
DEFAULT_ENV = Path(__file__).resolve().parents[1] / ".env"


class ConfigError(RuntimeError):
    """Raised when configuration is missing or unusable."""


def load_dotenv(path: Path = DEFAULT_ENV) -> None:
    """Read KEY=VALUE pairs into os.environ without overwriting real env vars.

    Deliberately minimal rather than pulling in python-dotenv: the file is ours
    and the format is fixed. Existing environment always wins, so a launchd job
    or a shell export can override the file without editing it.
    """
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


class Config:
    """Thin wrapper over the parsed YAML with typed accessors."""

    def __init__(self, data: dict, path: Optional[Path] = None):
        self.data = data
        self.path = path

    @classmethod
    def load(cls, path: Optional[Path] = None) -> "Config":
        path = Path(path) if path else DEFAULT_CONFIG
        if not path.exists():
            raise ConfigError(
                f"No config at {path}. Copy config.example.yaml to config.yaml "
                "and edit it."
            )
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        return cls(data, path)

    def get(self, *keys: str, default: Any = None) -> Any:
        node: Any = self.data
        for key in keys:
            if not isinstance(node, dict) or key not in node:
                return default
            node = node[key]
        return node

    # -- convenience accessors used across the pipeline --------------------
    @property
    def timezone_name(self) -> str:
        return self.get("timezone", default="UTC")

    @property
    def watch(self) -> list[dict]:
        return self.get("watch", default=[]) or []

    @property
    def known_subjects(self) -> list[str]:
        """Subjects the title parser should recognise.

        Union of the syllabus keys and the watch list, so adding a subject in
        either place is enough to make it parse.
        """
        subjects = set((self.get("syllabus", default={}) or {}).keys())
        subjects |= {row.get("subject") for row in self.watch if row.get("subject")}
        subjects |= set((self.get("drive", "subjects", default={}) or {}).keys())
        return sorted(s for s in subjects if s)

    def resolve_path(self, *keys: str, default: str) -> Path:
        """Resolve a configured path relative to the project directory."""
        raw = self.get(*keys, default=default) or default
        candidate = Path(raw).expanduser()
        if not candidate.is_absolute():
            candidate = (Path(__file__).resolve().parents[1] / candidate).resolve()
        return candidate


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ConfigError(
            f"{name} is not set. Add it to .env (see .env.example) or export it."
        )
    return value
