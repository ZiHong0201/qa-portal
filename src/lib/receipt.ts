// A receipt's content, shared by the on-screen receipt, the preview before
// sending, and the email - so all three always say the same thing.
import { PAYMENT_METHODS, PAYMENT_SITE_NAME, isPaymentMethod, periodLabel, rm } from "@/lib/fees";

export type ReceiptData = {
  receiptNo: string | null; // null in the preview, before it is assigned
  name: string;
  email: string;
  grade: string;
  subjects: string[];
  startMonth: string;
  months: number;
  normalSen: number;
  amountSen: number;
  priceNote: string | null;
  method: string;
  paidOn: string;
  note: string | null;
};

export function receiptRows(r: ReceiptData): [string, string][] {
  return [
    ["Received from", r.name],
    ["Email", r.email],
    ["Grade", r.grade],
    ["Subjects", `${r.subjects.join(", ")} (${r.subjects.length})`],
    ["Period", `${periodLabel(r.startMonth, r.months)} (${r.months} month${r.months === 1 ? "" : "s"})`],
    ["Paid by", isPaymentMethod(r.method) ? PAYMENT_METHODS[r.method] : r.method],
    ...(r.note ? ([["Note", r.note]] as [string, string][]) : []),
  ];
}

export function receiptSubject(r: ReceiptData): string {
  return `${PAYMENT_SITE_NAME} receipt ${r.receiptNo ?? ""} - ${periodLabel(r.startMonth, r.months)}`.replace("  ", " ");
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The email version. Email clients ignore stylesheets, so every style is
 * inline and the layout is a table - that is what renders the same in Gmail,
 * Outlook and a phone's mail app.
 */
export function receiptEmailHtml(r: ReceiptData): string {
  const rows = receiptRows(r)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:4px 0;color:#111827">${esc(v)}</td></tr>`
    )
    .join("");
  const saving =
    r.amountSen < r.normalSen
      ? `<tr><td style="padding:4px 0;color:#6b7280">Normal price</td><td style="padding:4px 0;text-align:right;color:#6b7280;text-decoration:line-through">${rm(r.normalSen)}</td></tr>
         <tr><td style="padding:4px 0;color:#0f766e">${esc(r.priceNote ?? "Promotion")}</td><td style="padding:4px 0;text-align:right;color:#0f766e">-${rm(r.normalSen - r.amountSen)}</td></tr>`
      : "";
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;font-size:14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px">
<tr><td style="padding:20px 24px;background:#115e59;border-radius:12px 12px 0 0;color:#ffffff">
  <div style="font-size:20px;font-weight:bold">${esc(PAYMENT_SITE_NAME)}</div>
  <div style="font-size:13px;opacity:.85">Official receipt</div>
</td></tr>
<tr><td style="padding:20px 24px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
    <tr><td style="color:#6b7280">Receipt no.</td><td style="text-align:right;font-family:monospace;font-weight:bold">${esc(r.receiptNo ?? "")}</td></tr>
    <tr><td style="color:#6b7280">Date paid</td><td style="text-align:right">${esc(r.paidOn)}</td></tr>
  </table>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:16px">${rows}</table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e7e5e4;padding-top:8px">
    ${saving}
    <tr><td style="padding:10px 0 0;font-size:16px;font-weight:bold;color:#115e59">Amount paid</td><td style="padding:10px 0 0;text-align:right;font-size:22px;font-weight:bold;color:#115e59">${rm(r.amountSen)}</td></tr>
  </table>
</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #e7e5e4;color:#9ca3af;font-size:12px">Thank you. Please keep this receipt for your records.</td></tr>
</table></body></html>`;
}

export function receiptEmailText(r: ReceiptData): string {
  const lines = [
    `${PAYMENT_SITE_NAME} - Official receipt`,
    `Receipt no.: ${r.receiptNo ?? ""}`,
    `Date paid: ${r.paidOn}`,
    "",
    ...receiptRows(r).map(([k, v]) => `${k}: ${v}`),
    "",
  ];
  if (r.amountSen < r.normalSen) {
    lines.push(`Normal price: ${rm(r.normalSen)}`, `${r.priceNote ?? "Promotion"}: -${rm(r.normalSen - r.amountSen)}`);
  }
  lines.push(`Amount paid: ${rm(r.amountSen)}`, "", "Thank you. Please keep this receipt for your records.");
  return lines.join("\n");
}
