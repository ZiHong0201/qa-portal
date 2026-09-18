"""Read the teaching schedule from Apple Calendar.

The calendar is what turns this from an inference problem into a lookup. If
the schedule says "Physics F5 - Ch3 Electricity, 16:00-17:30", then subject,
form, chapter and the expected time window are all declared ground truth
before the lesson even happens, and Claude's job shrinks from deciding what a
recording is to confirming it matches what was planned.

Two access routes, both free and neither needing a server:
  caldav - iCloud over CalDAV with an app-specific password (recommended)
  ics    - a published-calendar URL, no credentials at all
"""

from __future__ import annotations

import datetime as dt
import logging
import os
from typing import Optional

from .models import CalendarEvent

log = logging.getLogger(__name__)

CALDAV_URL = "https://caldav.icloud.com"


class CalendarError(RuntimeError):
    pass


def _as_aware(value, fallback_tz: dt.tzinfo) -> dt.datetime:
    """Coerce a date or naive datetime into an aware datetime."""
    if isinstance(value, dt.datetime):
        return value if value.tzinfo else value.replace(tzinfo=fallback_tz)
    if isinstance(value, dt.date):
        return dt.datetime.combine(value, dt.time.min, tzinfo=fallback_tz)
    raise CalendarError(f"Unsupported date value: {value!r}")


def _component_to_event(
    component, fallback_tz: dt.tzinfo, known_subjects: list[str]
) -> Optional[CalendarEvent]:
    try:
        start_prop = component.get("DTSTART")
        if start_prop is None:
            return None
        start = _as_aware(start_prop.dt, fallback_tz)

        end_prop = component.get("DTEND")
        if end_prop is not None:
            end = _as_aware(end_prop.dt, fallback_tz)
        else:
            duration = component.get("DURATION")
            end = start + (duration.dt if duration else dt.timedelta(hours=1))

        title = str(component.get("SUMMARY") or "").strip()
        if not title:
            return None

        return CalendarEvent.from_raw(
            uid=str(component.get("UID") or f"{title}-{start.isoformat()}"),
            title=title,
            start=start,
            end=end,
            notes=str(component.get("DESCRIPTION") or ""),
            known_subjects=known_subjects,
        )
    except Exception as exc:  # one malformed event must not lose the rest
        log.warning("Skipping unreadable calendar event: %s", exc)
        return None


class CalendarReader:
    def __init__(
        self,
        source: str,
        calendar_name: str,
        known_subjects: list[str],
        tz: dt.tzinfo,
    ):
        self.source = source
        self.calendar_name = calendar_name
        self.known_subjects = known_subjects
        self.tz = tz

    def events_between(self, start: dt.datetime, end: dt.datetime) -> list[CalendarEvent]:
        if self.source == "ics":
            return self._from_ics(start, end)
        return self._from_caldav(start, end)

    # -- iCloud CalDAV ------------------------------------------------------
    def _from_caldav(self, start, end) -> list[CalendarEvent]:
        import caldav

        username = os.environ.get("ICLOUD_USERNAME", "").strip()
        password = os.environ.get("ICLOUD_APP_PASSWORD", "").strip()
        if not username or not password:
            raise CalendarError(
                "ICLOUD_USERNAME / ICLOUD_APP_PASSWORD are not set. Generate an "
                "app-specific password at appleid.apple.com (needs 2FA enabled)."
            )

        client = caldav.DAVClient(url=CALDAV_URL, username=username, password=password)
        principal = client.principal()

        target = None
        for calendar in principal.calendars():
            name = getattr(calendar, "name", None) or ""
            if name.strip().lower() == self.calendar_name.strip().lower():
                target = calendar
                break
        if target is None:
            available = ", ".join(
                (getattr(c, "name", "") or "?") for c in principal.calendars()
            )
            raise CalendarError(
                f"Calendar '{self.calendar_name}' not found in iCloud. "
                f"Available: {available}"
            )

        # expand=True makes the server materialise recurring events, which
        # matters because a weekly timetable is almost always a recurring rule.
        results = target.search(start=start, end=end, event=True, expand=True)

        events: list[CalendarEvent] = []
        for item in results:
            for component in self._components(item):
                event = _component_to_event(component, self.tz, self.known_subjects)
                if event:
                    events.append(event)
        return events

    @staticmethod
    def _components(item):
        """Yield VEVENT components from a caldav result across library versions."""
        component = getattr(item, "icalendar_component", None)
        if component is not None:
            return [component]
        try:
            from icalendar import Calendar as ICalendar

            parsed = ICalendar.from_ical(item.data)
            return [c for c in parsed.walk() if c.name == "VEVENT"]
        except Exception as exc:
            log.warning("Could not parse calendar item: %s", exc)
            return []

    # -- published ICS URL --------------------------------------------------
    def _from_ics(self, start, end) -> list[CalendarEvent]:
        import requests
        from icalendar import Calendar as ICalendar

        url = os.environ.get("CALENDAR_ICS_URL", "").strip()
        if not url:
            raise CalendarError(
                "CALENDAR_ICS_URL is not set. In Calendar.app, right-click the "
                "Teaching calendar, choose Share Calendar, tick Public Calendar, "
                "and copy the URL (change webcal:// to https://)."
            )
        url = url.replace("webcal://", "https://")

        response = requests.get(url, timeout=60)
        response.raise_for_status()
        calendar = ICalendar.from_ical(response.content)

        try:
            import recurring_ical_events

            components = recurring_ical_events.of(calendar).between(start, end)
        except ImportError:
            log.warning(
                "recurring-ical-events not installed; recurring lessons will be "
                "missed. Install it with: pip install recurring-ical-events"
            )
            components = [c for c in calendar.walk() if c.name == "VEVENT"]

        events = []
        for component in components:
            event = _component_to_event(component, self.tz, self.known_subjects)
            if event and event.end >= start and event.start <= end:
                events.append(event)
        return events
