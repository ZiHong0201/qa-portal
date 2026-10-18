// Pure fee logic for YH-ideal-payment: money, months, bill totals. Free of
// Prisma so client components can use it; the queries are in fees.server.ts.
import { dayKey } from "@/lib/check-in";

export const PAYMENT_SITE_NAME = "YH Ideal Payment";

// The payment site is a second Vercel project built from this same code, so
// its address is "<project name>.vercel.app" - yh-ideal-payment, or with a
// suffix Vercel adds when the name is taken. Each site keeps its own login, as
// browsers keep sign-ins per address.
export const PORTAL_ORIGIN = process.env.PORTAL_ORIGIN || "https://qa-portal-beta.vercel.app";

export function isPaymentHost(host: string | null | undefined): boolean {
  // "yh-ideal-payment.vercel.app", "yh-ideal-payment-abc123.vercel.app" (a
  // suffixed name or a preview build), and "yh-ideal-payment.localhost:3000"
  // on a dev machine. The portal's addresses all start "qa-portal".
  return !!host && /^yh-ideal-payment[.-]/.test(host.split(":")[0]);
}

// The payment site's link back to the portal. On the live deployment it crosses
// to the portal's address; anywhere else (a dev machine, a preview build) both
// are the one host, so the path alone is right. Server-side only: VERCEL_ENV is
// not sent to the browser.
const live = () => process.env.VERCEL_ENV === "production";
export const portalHref = (path: string) => (live() ? `${PORTAL_ORIGIN}${path}` : path);

export const PAYMENT_METHODS = {
  CASH: "Cash",
  TRANSFER: "Bank transfer",
  OTHER: "Other",
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export function isPaymentMethod(v: unknown): v is PaymentMethod {
  return typeof v === "string" && v in PAYMENT_METHODS;
}

// ---- money ------------------------------------------------------------------

/** 12345 -> "RM123.45". */
export function rm(sen: number): string {
  const sign = sen < 0 ? "-" : "";
  const abs = Math.abs(sen);
  const ringgit = Math.floor(abs / 100).toLocaleString("en-MY");
  return `${sign}RM${ringgit}.${String(abs % 100).padStart(2, "0")}`;
}

/** "120", "120.5", "RM 1,200.50" -> sen; null if it is not an amount. */
export function parseRinggit(input: unknown): number | null {
  if (typeof input !== "string") return null;
  const cleaned = input.replace(/rm/i, "").replace(/[,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  // Through a string, not a float multiply: 0.29 * 100 is 28.999999999999996.
  const [whole, frac = ""] = cleaned.replace("-", "").split(".");
  const sen = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return cleaned.startsWith("-") ? -sen : sen;
}

/** 12345 -> "123.45", for an input's starting value. */
export function senToInput(sen: number): string {
  return (sen / 100).toFixed(2);
}

// ---- months -----------------------------------------------------------------

/** "2026-10", Malaysia time. */
export function monthKey(date: Date = new Date()): string {
  return dayKey(date).slice(0, 7);
}

export function isMonthKey(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

/** "2026-10" -> "October 2026". */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ---- periods ----------------------------------------------------------------

/** The last month a payment covers: 3 months from "2026-11" ends "2027-01". */
export function endMonth(startMonth: string, months: number): string {
  return shiftMonth(startMonth, months - 1);
}

/** "October 2026", or "October 2026 - December 2026" for a run. */
export function periodLabel(startMonth: string, months: number): string {
  return months === 1 ? monthLabel(startMonth) : `${monthLabel(startMonth)} - ${monthLabel(endMonth(startMonth, months))}`;
}

/** Whether a payment's run of months includes `month`. Month keys sort as strings. */
export function covers(p: { startMonth: string; months: number }, month: string): boolean {
  return p.startMonth <= month && month <= endMonth(p.startMonth, p.months);
}

export type Charge = { label: string; amountSen: number };

/** A receipt's extra charges, stored as JSON. */
export function parseCharges(json: string): Charge[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v)
      ? v.filter((c) => c && typeof c.label === "string" && Number.isInteger(c.amountSen))
      : [];
  } catch {
    return [];
  }
}

export function parseSubjects(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
