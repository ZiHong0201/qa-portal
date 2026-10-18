// Pure fee logic for YH-ideal-payment: money, months, bill totals. Free of
// Prisma so client components can use it; the queries are in fees.server.ts.
import { dayKey } from "@/lib/check-in";

export const PAYMENT_SITE_NAME = "YH Ideal Payment";

// The address the payment site is served at (see src/proxy.ts), and the
// portal's own. Each has its own login, as browsers keep sign-ins per address.
export const PAYMENT_HOST = "yh-ideal-payment.vercel.app";
export const PORTAL_ORIGIN = "https://qa-portal-beta.vercel.app";

export function isPaymentHost(host: string | null | undefined): boolean {
  // "yh-ideal-payment.localhost:3000" reaches it on a dev machine.
  return !!host && host.split(":")[0].startsWith("yh-ideal-payment.");
}

// Links between the two sites. On the live deployment they cross to the other
// address; anywhere else (a dev machine, a preview build) both sites are the
// one host, so the path alone is right. Server-side only: VERCEL_ENV is not
// sent to the browser.
const live = () => process.env.VERCEL_ENV === "production";
export const paymentHref = (path: string) => (live() ? `https://${PAYMENT_HOST}${path}` : path);
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

// ---- bills ------------------------------------------------------------------

export type BillLine = { subject: string; amountSen: number };

export function parseLines(json: string): BillLine[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function billTotal(bill: { lines: string; adjustmentSen: number }): number {
  return parseLines(bill.lines).reduce((sum, l) => sum + l.amountSen, 0) + bill.adjustmentSen;
}

export type BillStatus = "PAID" | "PARTIAL" | "UNPAID";

export function billStatus(totalSen: number, paidSen: number): BillStatus {
  if (paidSen >= totalSen) return "PAID";
  return paidSen > 0 ? "PARTIAL" : "UNPAID";
}

export const STATUS_LABEL: Record<BillStatus, string> = {
  PAID: "Paid",
  PARTIAL: "Part paid",
  UNPAID: "Unpaid",
};

export const STATUS_STYLE: Record<BillStatus, string> = {
  PAID: "bg-emerald-100 text-emerald-800",
  PARTIAL: "bg-amber-100 text-amber-800",
  UNPAID: "bg-rose-100 text-rose-700",
};
