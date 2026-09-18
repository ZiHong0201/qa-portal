"""Command line entry points.

    python -m archiver.cli doctor        check credentials and settings
    python -m archiver.cli auth-drive    one-time Google Drive consent
    python -m archiver.cli calendar      print what the calendar reader sees
    python -m archiver.cli run           poll Zoom and archive (--dry-run to rehearse)
    python -m archiver.cli reconcile     scheduled vs archived, and alert on gaps
    python -m archiver.cli sweep         retention tiering
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

from .config import Config, ConfigError, load_dotenv


def _setup_logging(verbose: bool) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)-22s %(message)s",
        datefmt="%H:%M:%S",
    )
    for noisy in ("googleapiclient", "urllib3", "caldav", "httpx", "anthropic"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def cmd_doctor(config: Config, args) -> int:
    """Check everything that can be checked without doing real work."""
    from .calendar_src import CalendarReader

    ok = True

    def check(label: str, passed: bool, detail: str = "") -> None:
        nonlocal ok
        print(f"  {'PASS' if passed else 'FAIL'}  {label}{'  — ' + detail if detail else ''}")
        ok = ok and passed

    print("\nConfiguration")
    check("config.yaml found", config.path is not None and Path(config.path).exists(),
          str(config.path))
    check("watch list is not empty", bool(config.watch),
          ", ".join(f"{w.get('subject')} {w.get('form')}" for w in config.watch))
    check("syllabus has entries", bool(config.get("syllabus", default={})))

    print("\nCredentials in environment")
    for name in ("ZOOM_ACCOUNT_ID", "ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET"):
        check(name, bool(os.environ.get(name)))

    source = config.get("calendar", "source", default="caldav")
    if source == "caldav":
        for name in ("ICLOUD_USERNAME", "ICLOUD_APP_PASSWORD"):
            check(name, bool(os.environ.get(name)))
    else:
        check("CALENDAR_ICS_URL", bool(os.environ.get("CALENDAR_ICS_URL")))

    backend = config.get("classify", "backend", default="claude-code")
    if backend == "api":
        check("ANTHROPIC_API_KEY", bool(os.environ.get("ANTHROPIC_API_KEY")),
              "needed because classify.backend is 'api'")
    else:
        from .classify import find_claude_binary
        found = find_claude_binary()
        check("claude CLI found", bool(found),
              found or "install: curl -fsSL https://claude.ai/install.sh | bash")

    notify_backend = config.get("notify", "backend", default="telegram")
    if notify_backend == "telegram":
        check("TELEGRAM_BOT_TOKEN", bool(os.environ.get("TELEGRAM_BOT_TOKEN")))
        check("TELEGRAM_CHAT_ID", bool(os.environ.get("TELEGRAM_CHAT_ID")))

    print("\nLive checks")
    try:
        from .pipeline import Pipeline
        pipeline = Pipeline(config)
        token = pipeline.zoom.token
        check("Zoom OAuth token", bool(token))
        try:
            recordings = pipeline.zoom.list_recordings(lookback_days=7)
            check("Zoom recordings readable", True, f"{len(recordings)} in the last 7 days")
        except Exception as exc:
            check("Zoom recordings readable", False, str(exc)[:160])
        pipeline.close()
    except Exception as exc:
        check("Zoom OAuth token", False, str(exc)[:160])

    try:
        reader = CalendarReader(
            source=source,
            calendar_name=config.get("calendar", "calendar_name", default="Teaching"),
            known_subjects=config.known_subjects,
            tz=__import__("zoneinfo").ZoneInfo(config.timezone_name),
        )
        now = datetime.now()
        events = reader.events_between(now - timedelta(days=7), now + timedelta(days=7))
        check("Calendar readable", True, f"{len(events)} events in a 14-day window")
    except Exception as exc:
        check("Calendar readable", False, str(exc)[:200])

    try:
        from .drive import TOKEN_FILE
        check("Drive authorised", TOKEN_FILE.exists(),
              "run: python -m archiver.cli auth-drive" if not TOKEN_FILE.exists() else "")
    except Exception as exc:
        check("Drive authorised", False, str(exc)[:160])

    print("\n" + ("All checks passed." if ok else "Some checks failed — see above."))
    return 0 if ok else 1


def cmd_auth_drive(config: Config, args) -> int:
    from .drive import DriveClient, TOKEN_FILE

    client = DriveClient(config.get("drive", "oauth_scope", default="drive.file"))
    client.authorise(interactive=True)
    print(f"Drive authorised. Refresh token saved to {TOKEN_FILE}")
    return 0


def cmd_calendar(config: Config, args) -> int:
    """Show what the reader sees, and how each title parses. Use this to check
    your title convention before trusting the archiver with it."""
    from zoneinfo import ZoneInfo

    from .calendar_src import CalendarReader

    tz = ZoneInfo(config.timezone_name)
    now = datetime.now(tz)
    reader = CalendarReader(
        source=config.get("calendar", "source", default="caldav"),
        calendar_name=config.get("calendar", "calendar_name", default="Teaching"),
        known_subjects=config.known_subjects,
        tz=tz,
    )
    events = reader.events_between(
        now - timedelta(days=args.days), now + timedelta(days=args.days)
    )
    if not events:
        print("No events found in the window.")
        return 0

    print(f"\n{len(events)} event(s):\n")
    for event in sorted(events, key=lambda e: e.start):
        if event.is_all_day:
            continue
        parsed = f"subject={event.subject!r} form={event.form!r} chapter={event.chapter!r}"
        print(f"  {event.start.astimezone(tz):%a %d %b %H:%M}  {event.title}")
        print(f"      -> {parsed}")
    return 0


def cmd_run(config: Config, args) -> int:
    from .pipeline import Pipeline

    pipeline = Pipeline(config, dry_run=args.dry_run)
    try:
        result = pipeline.run_once()
        print(
            f"Found {result['found']} new, processed {result['processed']}, "
            f"failed {result['failed']}."
        )
        return 1 if result["failed"] else 0
    finally:
        pipeline.close()


def cmd_reconcile(config: Config, args) -> int:
    from .pipeline import Pipeline

    pipeline = Pipeline(config)
    try:
        result = pipeline.reconcile(days=args.days)
        print(
            f"Scheduled {result['scheduled']}, archived {result['archived']}, "
            f"missing {result['missing']}, stuck {result['stuck']}."
        )
        return 1 if (result["missing"] or result["stuck"]) else 0
    finally:
        pipeline.close()


def cmd_sweep(config: Config, args) -> int:
    from .pipeline import Pipeline

    pipeline = Pipeline(config, dry_run=args.dry_run)
    try:
        result = pipeline.sweep()
        print(
            f"Considered {result['considered']}, dropped video from "
            f"{result['removed']}, freed {result['freed_gb']:.1f} GB."
        )
        return 0
    finally:
        pipeline.close()


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        prog="archiver", description="Archive Zoom lesson recordings into Google Drive."
    )
    parser.add_argument("--config", type=Path, help="path to config.yaml")
    parser.add_argument("-v", "--verbose", action="store_true")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("doctor", help="check configuration and credentials").set_defaults(
        func=cmd_doctor
    )
    sub.add_parser("auth-drive", help="one-time Google Drive consent").set_defaults(
        func=cmd_auth_drive
    )

    calendar_parser = sub.add_parser("calendar", help="show parsed calendar events")
    calendar_parser.add_argument("--days", type=int, default=7)
    calendar_parser.set_defaults(func=cmd_calendar)

    run_parser = sub.add_parser("run", help="poll Zoom and archive new recordings")
    run_parser.add_argument(
        "--dry-run", action="store_true",
        help="decide and report without downloading, filing or deleting anything",
    )
    run_parser.set_defaults(func=cmd_run)

    reconcile_parser = sub.add_parser(
        "reconcile", help="compare scheduled lessons against archived ones"
    )
    reconcile_parser.add_argument("--days", type=int, default=1)
    reconcile_parser.set_defaults(func=cmd_reconcile)

    sweep_parser = sub.add_parser("sweep", help="apply video retention tiering")
    sweep_parser.add_argument("--dry-run", action="store_true")
    sweep_parser.set_defaults(func=cmd_sweep)

    args = parser.parse_args(argv)
    _setup_logging(args.verbose)
    load_dotenv()

    try:
        config = Config.load(args.config)
    except ConfigError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return 2

    try:
        return args.func(config, args)
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        return 130
    except Exception as exc:
        logging.getLogger("archiver").exception("Fatal: %s", exc)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
