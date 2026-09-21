// Pure announcement helpers: converting between the admin's local wall-clock
// time and the UTC instants stored in the database. Kept free of Prisma so the
// admin form and the ticker can import from here without dragging the database
// client into the browser bundle - the query lives in announcements.server.ts.

import { CHECK_IN_TIME_ZONE } from "@/lib/check-in";

// Malaysia is a fixed UTC+8 with no daylight saving, so a plain offset is
// exact - no need for a zone database. CHECK_IN_TIME_ZONE is re-exported as
// the human-readable name for labels, so the two can never disagree about
// which country the portal runs in.
export const LOCAL_UTC_OFFSET = "+08:00";
export const LOCAL_TIME_ZONE = CHECK_IN_TIME_ZONE;

export const ANNOUNCEMENT_MAX_LENGTH = 300;

/**
 * Turns a <input type="datetime-local"> value ("2026-10-01T08:00") into the
 * instant it names in Malaysian time.
 *
 * Doing this by hand matters: `new Date("2026-10-01T08:00")` is parsed in the
 * *server's* zone, which is UTC on Vercel, so a notice set for 8am would go
 * live at 4pm local.
 */
export function localInputToDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // datetime-local omits seconds when they are zero; append them so the string
  // is a complete ISO 8601 instant once the offset is attached.
  const withSeconds = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  const date = new Date(`${withSeconds}${LOCAL_UTC_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The reverse: formats a stored instant as the "YYYY-MM-DDTHH:mm" string a
 * datetime-local input expects, in Malaysian time.
 */
export function dateToLocalInput(date: Date | null | undefined): string {
  if (!date) return "";
  // Shift by the offset, then read the UTC parts - that gives the local
  // wall-clock reading without depending on the server's own zone.
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

/** A short human label for a window, e.g. "1 Oct, 08:00 - 5 Oct, 18:00". */
export function formatWindow(startsAt: Date | null, endsAt: Date | null): string {
  if (!startsAt && !endsAt) return "Always on";
  if (startsAt && !endsAt) return `From ${formatLocal(startsAt)}`;
  if (!startsAt && endsAt) return `Until ${formatLocal(endsAt)}`;
  return `${formatLocal(startsAt!)} - ${formatLocal(endsAt!)}`;
}

function formatLocal(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LOCAL_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** Whether a notice would be on screen at `now`, given its switch and window. */
export function isLive(
  a: { isActive: boolean; startsAt: Date | null; endsAt: Date | null },
  now: Date = new Date()
): boolean {
  if (!a.isActive) return false;
  if (a.startsAt && a.startsAt > now) return false;
  if (a.endsAt && a.endsAt < now) return false;
  return true;
}
