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
  amountSen: number; // everything paid, tuition plus any extra charge
  priceNote: string | null;
  extraLabel: string | null;
  extraSen: number;
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

export type MoneyLine = { label: string; sen: number; kind: "struck" | "saving" | "plain" };

/**
 * The money above "Amount paid": the normal price and the promotion's saving
 * when there is one, the tuition on its own when an extra charge follows it,
 * and the extra charge. The same lines on screen, in print and in the email.
 */
export function moneyLines(r: ReceiptData): MoneyLine[] {
  const tuition = r.amountSen - r.extraSen;
  const lines: MoneyLine[] = [];
  if (tuition < r.normalSen) {
    lines.push({ label: "Tuition, normal price", sen: r.normalSen, kind: "struck" });
    lines.push({ label: r.priceNote ?? "Promotion", sen: -(r.normalSen - tuition), kind: "saving" });
  } else if (r.extraSen > 0) {
    lines.push({ label: "Tuition fee", sen: tuition, kind: "plain" });
  }
  if (r.extraSen > 0) lines.push({ label: r.extraLabel ?? "Extra charge", sen: r.extraSen, kind: "plain" });
  return lines;
}

export function receiptSubject(r: ReceiptData): string {
  return `${PAYMENT_SITE_NAME} receipt ${r.receiptNo ?? ""} - ${periodLabel(r.startMonth, r.months)}`.replace("  ", " ");
}

/** The logo is attached to the email under this id and shown from it. */
export const RECEIPT_LOGO_CID = "logo@yh-ideal-payment";

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
  const money = moneyLines(r)
    .map((l) => {
      const colour = l.kind === "saving" ? "#0f766e" : l.kind === "struck" ? "#6b7280" : "#111827";
      const strike = l.kind === "struck" ? ";text-decoration:line-through" : "";
      return `<tr><td style="padding:4px 0;color:${colour}">${esc(l.label)}</td><td style="padding:4px 0;text-align:right;color:${colour}${strike}">${rm(l.sen)}</td></tr>`;
    })
    .join("");
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;font-size:14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px">
<tr><td style="padding:18px 24px 14px;border-bottom:4px solid #0f766e">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td><img src="cid:${RECEIPT_LOGO_CID}" alt="赵老师历史讲堂" width="208" height="73" style="display:block;border:0"></td>
    <td style="text-align:right;vertical-align:middle;color:#115e59;font-size:13px;font-weight:bold;letter-spacing:1px">OFFICIAL RECEIPT</td>
  </tr></table>
</td></tr>
<tr><td style="padding:20px 24px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
    <tr><td style="color:#6b7280">Receipt no.</td><td style="text-align:right;font-family:monospace;font-weight:bold">${esc(r.receiptNo ?? "")}</td></tr>
    <tr><td style="color:#6b7280">Date paid</td><td style="text-align:right">${esc(r.paidOn)}</td></tr>
  </table>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:16px">${rows}</table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e7e5e4;padding-top:8px">
    ${money}
    <tr><td style="padding:10px 0 0;font-size:16px;font-weight:bold;color:#115e59">Amount paid</td><td style="padding:10px 0 0;text-align:right;font-size:22px;font-weight:bold;color:#115e59">${rm(r.amountSen)}</td></tr>
  </table>
</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #e7e5e4;color:#9ca3af;font-size:12px">Thank you. Please keep this receipt for your records.</td></tr>
</table></body></html>`;
}

export function receiptEmailText(r: ReceiptData): string {
  const lines = [
    `赵老师历史讲堂 - Official receipt (${PAYMENT_SITE_NAME})`,
    `Receipt no.: ${r.receiptNo ?? ""}`,
    `Date paid: ${r.paidOn}`,
    "",
    ...receiptRows(r).map(([k, v]) => `${k}: ${v}`),
    "",
  ];
  for (const l of moneyLines(r)) lines.push(`${l.label}: ${rm(l.sen)}`);
  lines.push(`Amount paid: ${rm(r.amountSen)}`, "", "Thank you. Please keep this receipt for your records.");
  return lines.join("\n");
}
