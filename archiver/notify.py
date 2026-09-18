"""Progress notifications.

One message per lesson, edited in place as it moves through the stages, rather
than four separate pings. Telegram is the default because it is free, reaches
a phone, and needs no subscription; macOS banners are the offline fallback.
"""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
from typing import Optional

import requests

log = logging.getLogger(__name__)

TELEGRAM_API = "https://api.telegram.org/bot{token}/{method}"


class Notifier:
    """Base notifier: logs only."""

    def send(self, text: str, key: Optional[str] = None) -> None:
        log.info("NOTIFY: %s", text.replace("\n", " | "))

    def close(self) -> None:
        pass


class TelegramNotifier(Notifier):
    def __init__(self, token: str, chat_id: str, edit_in_place: bool = True):
        self.token = token
        self.chat_id = chat_id
        self.edit_in_place = edit_in_place
        self._message_ids: dict[str, int] = {}

    def _call(self, method: str, payload: dict) -> Optional[dict]:
        try:
            response = requests.post(
                TELEGRAM_API.format(token=self.token, method=method),
                json=payload, timeout=20,
            )
            data = response.json()
            if not data.get("ok"):
                log.warning("Telegram %s failed: %s", method, data.get("description"))
                return None
            return data.get("result")
        except Exception as exc:
            # A failed notification must never fail the archive run.
            log.warning("Telegram %s error: %s", method, exc)
            return None

    def send(self, text: str, key: Optional[str] = None) -> None:
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }

        if self.edit_in_place and key and key in self._message_ids:
            edited = self._call(
                "editMessageText",
                {**payload, "message_id": self._message_ids[key]},
            )
            if edited is not None:
                return
            # Editing can fail if the text is unchanged or the message aged out;
            # fall through and post a fresh one rather than losing the update.

        result = self._call("sendMessage", payload)
        if result and key:
            self._message_ids[key] = result["message_id"]


class MacNotifier(Notifier):
    def send(self, text: str, key: Optional[str] = None) -> None:
        super().send(text, key)
        binary = shutil.which("osascript")
        if not binary:
            return
        first_line = text.splitlines()[0][:200].replace('"', "'")
        try:
            subprocess.run(
                [binary, "-e",
                 f'display notification "{first_line}" with title "Lesson Archiver"'],
                capture_output=True, timeout=10,
            )
        except Exception as exc:
            log.warning("macOS notification failed: %s", exc)


def build_notifier(config) -> Notifier:
    backend = config.get("notify", "backend", default="telegram")
    edit_in_place = bool(config.get("notify", "edit_in_place", default=True))

    if backend == "telegram":
        token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
        chat_id = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
        if token and chat_id:
            return TelegramNotifier(token, chat_id, edit_in_place)
        log.warning(
            "notify.backend is 'telegram' but TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID "
            "are not set; falling back to log-only notifications"
        )
        return Notifier()

    if backend == "macos":
        return MacNotifier()
    return Notifier()
