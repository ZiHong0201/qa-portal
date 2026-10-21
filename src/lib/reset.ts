// Pure scheduling logic for the annual reset. No Prisma, so the warning
// banner can import it without dragging the database client into the browser.

import { LOCAL_UTC_OFFSET } from "@/lib/announcements";
import { dateLocale, type UiLang } from "@/lib/i18n";
import { shellText } from "@/lib/text/shell";

/**
 * When the portal wipes itself back to zero.
 *
 * Written as Malaysian midnight rather than UTC, because that is the date the
 * disclaimer promises students and the one they will be counting down to. In
 * UTC it lands at 16:00 on 31 December, which is correct and would look like a
 * bug if it were hard-coded that way instead.
 */
export const RESET_AT = new Date(`2027-01-01T00:00:00${LOCAL_UTC_OFFSET}`);

/** How long everyone is warned before it happens. */
export const WARNING_DAYS = 7;

export const WARNING_FROM = new Date(RESET_AT.getTime() - WARNING_DAYS * 86_400_000);

export type ResetPhase = "far-off" | "warning" | "due";

export function resetPhase(now: Date = new Date()): ResetPhase {
  if (now >= RESET_AT) return "due";
  if (now >= WARNING_FROM) return "warning";
  return "far-off";
}

/** Whole days remaining, rounded up so "1 day" never means "in a minute". */
export function daysUntilReset(now: Date = new Date()): number {
  return Math.max(0, Math.ceil((RESET_AT.getTime() - now.getTime()) / 86_400_000));
}

export function formatResetDate(lang: UiLang = "en"): string {
  return new Intl.DateTimeFormat(dateLocale(lang), {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(RESET_AT);
}

/** The sentence students see during the warning week. */
export function resetWarningText(now: Date = new Date(), lang: UiLang = "en"): string {
  const days = daysUntilReset(now);
  const date = formatResetDate(lang);
  return days === 0 ? shellText[lang].resetToday(date) : shellText[lang].resetSoon(date, days);
}
