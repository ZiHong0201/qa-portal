// A receipt laid out as YH Ideal Academy's own template (Receipt.xlsx): the
// company block and OFFICIAL RECEIPT title, date and receipt number, BILL TO,
// a DESCRIPTION / QTY / UNIT PRICE / TOTAL table, the totals column ending in
// "Paid", the payment instructions and the non-refundable note. The screen,
// print and email versions all read from receiptLayout(), so they agree.
import { type Charge, endMonth, rm } from "@/lib/fees";
import { percent } from "@/lib/fee-plans";

export const COMPANY = {
  name: "YH IDEAL ACADEMY SDN. BHD.",
  regNo: "Reg No: 202501002575",
  address: ["1-30B, Jalan Desa 1/3,", "Desa Aman Puri,", "Kepong 52100 Kuala Lumpur."],
  paymentNote: 'All payments should be made to "YH Ideal Academy Sdn. Bhd." via bank transfer or other accepted payment methods.',
  bank: ["Bank Name : Alliance Bank", "Account No : 141490013039649"],
  footer: "Fees paid are non-refundable and non-transferable; please retain this receipt for your records.",
  red: "#CC0000",
};

export type ReceiptData = {
  receiptNo: string | null; // null in the preview, before it is assigned
  name: string;
  email: string;
  grade: string;
  subjects: string[];
  startMonth: string;
  months: number;
  normalSen: number;
  amountSen: number; // everything paid: tuition, extra charges and tax
  priceNote: string | null;
  extras: Charge[];
  extraSen: number;
  taxRateBp: number;
  taxSen: number;
  extraDiscountSen: number;
  discountNote: string | null;
  method: string;
  paidOn: string;
  note: string | null;
};

export type LineItem = { description: string; detail: string | null; qty: number; unitSen: number; totalSen: number };

export type ReceiptLayout = {
  date: string;
  receiptNo: string;
  billTo: string[];
  items: LineItem[];
  subtotalSen: number;
  discountSen: number;
  lessDiscountSen: number;
  taxRate: string;
  taxSen: number;
  paidSen: number;
};

const SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10", 3 -> "OCT - DEC 2026"; across a new year, "DEC 2026 - FEB 2027". */
export function periodShort(startMonth: string, months: number): string {
  const [y1, m1] = startMonth.split("-").map(Number);
  const [y2, m2] = endMonth(startMonth, months).split("-").map(Number);
  if (months === 1) return `${SHORT[m1 - 1]} ${y1}`;
  return y1 === y2 ? `${SHORT[m1 - 1]} - ${SHORT[m2 - 1]} ${y1}` : `${SHORT[m1 - 1]} ${y1} - ${SHORT[m2 - 1]} ${y2}`;
}

/** "2026-10-18" -> "18-Oct-26", the template's date format. */
export function receiptDate(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return `${d}-${MON[m - 1]}-${String(y).slice(2)}`;
}

/** 12345 -> "123.45", the template's plain number format. */
export const money = (sen: number) => rm(sen).replace("RM", "");

/**
 * The receipt's lines. Each extra charge ticked - the material fee and so on
 * - is a line of its own first, as in the template; then tuition, a month's
 * fee times the months. The DISCOUNT is a promotion's saving plus any
 * additional discount the admin gave, and tax is the rate on SUBTOTAL LESS
 * DISCOUNT.
 */
export function receiptLayout(r: ReceiptData): ReceiptLayout {
  // Tuition after any promotion: what was paid, less tax and the extra
  // charges, with the additional discount added back.
  const tuitionSen = r.amountSen - r.taxSen - r.extraSen + r.extraDiscountSen;
  const extraDiscount = r.extraDiscountSen
    ? `discount ${money(r.extraDiscountSen)}${r.discountNote ? ` (${r.discountNote})` : ""}`
    : null;
  const items: LineItem[] = r.extras.map((e) => ({
    description: e.label.toUpperCase(),
    detail: null,
    qty: 1,
    unitSen: e.amountSen,
    totalSen: e.amountSen,
  }));
  items.push({
    description: `CLASS SUBSCRIPTION FEE (${periodShort(r.startMonth, r.months)})`,
    detail: [`${r.grade} · ${r.subjects.join(", ")}`, r.priceNote, extraDiscount].filter(Boolean).join(" · "),
    qty: r.months,
    unitSen: Math.round(r.normalSen / r.months),
    totalSen: r.normalSen,
  });
  const subtotalSen = items.reduce((t, i) => t + i.totalSen, 0);
  const discountSen = r.normalSen - tuitionSen + r.extraDiscountSen;
  return {
    date: receiptDate(r.paidOn),
    receiptNo: r.receiptNo ?? "",
    billTo: [r.name, r.email],
    items,
    subtotalSen,
    discountSen,
    lessDiscountSen: subtotalSen - discountSen,
    taxRate: percent(r.taxRateBp),
    taxSen: r.taxSen,
    paidSen: r.amountSen,
  };
}

export function receiptSubject(r: ReceiptData): string {
  return `YH Ideal Academy - Official Receipt ${r.receiptNo ?? ""} (${periodShort(r.startMonth, r.months)})`;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The email version. Email clients ignore stylesheets, so every style is
 * inline and the layout is tables - what renders the same in Gmail, Outlook
 * and a phone's mail app.
 */
export function receiptEmailHtml(r: ReceiptData): string {
  const L = receiptLayout(r);
  const cell = "padding:5px 8px;font-size:12px;border:1px solid #bfbfbf";
  const items = L.items
    .map(
      (i) => `<tr>
  <td style="${cell}">${esc(i.description)}${i.detail ? `<div style="color:#6b7280;font-size:11px">${esc(i.detail)}</div>` : ""}</td>
  <td style="${cell};text-align:center">${i.qty}</td>
  <td style="${cell};text-align:right">${money(i.unitSen)}</td>
  <td style="${cell};text-align:right">${money(i.totalSen)}</td></tr>`
    )
    .join("");
  const total = (label: string, value: string) =>
    `<tr><td style="padding:3px 10px;text-align:right;font-weight:bold;font-size:12px;white-space:nowrap">${label}</td><td style="padding:3px 8px;text-align:right;font-size:12px;border-bottom:1px solid #e5e5e5;width:110px">${value}</td></tr>`;
  return `<!doctype html><html><body style="margin:0;padding:16px;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#fff">
<tr><td style="background:${COMPANY.red};height:20px"></td></tr>
<tr><td style="padding:24px 28px 8px">
  <div style="font-size:30px;margin-bottom:16px">OFFICIAL RECEIPT</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:top;font-size:13px;line-height:1.6">
      <b>${esc(COMPANY.name)}</b><br>${esc(COMPANY.regNo)}<br>${COMPANY.address.map(esc).join("<br>")}
    </td>
    <td style="vertical-align:top;text-align:right">
      <div style="display:inline-block;border:1px solid #bfbfbf;padding:6px 14px;font-weight:bold;font-size:13px;margin-bottom:8px">${esc(L.date)}</div><br>
      <div style="display:inline-block;border:1px solid #bfbfbf;padding:6px 14px;font-weight:bold;font-size:13px">RECEIPT NO. ${esc(L.receiptNo)}</div>
    </td>
  </tr></table>
</td></tr>
<tr><td style="padding:12px 28px 4px">
  <div style="font-weight:bold;font-size:13px;border-bottom:1px solid #bfbfbf;padding-bottom:3px">BILL TO</div>
  <div style="font-weight:bold;font-size:13px;margin-top:6px">${esc(L.billTo[0])}</div>
  <div style="font-size:12px;color:#444">${esc(L.billTo[1])}</div>
</td></tr>
<tr><td style="padding:14px 28px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
    <tr style="background:${COMPANY.red};color:#fff">
      <th style="${cell};border-color:${COMPANY.red};text-align:center">DESCRIPTION</th>
      <th style="${cell};border-color:${COMPANY.red};text-align:center;width:44px">QTY</th>
      <th style="${cell};border-color:${COMPANY.red};text-align:center;width:90px">UNIT PRICE</th>
      <th style="${cell};border-color:${COMPANY.red};text-align:center;width:90px">TOTAL</th>
    </tr>${items}
  </table>
</td></tr>
<tr><td style="padding:0 28px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:top;font-size:11px;line-height:1.5;padding-right:16px;color:#333">
      ${esc(COMPANY.paymentNote)}<br><br>${COMPANY.bank.map(esc).join("<br>")}
    </td>
    <td style="vertical-align:top;width:280px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${total("SUBTOTAL", money(L.subtotalSen))}
        ${total("DISCOUNT", L.discountSen ? money(L.discountSen) : "")}
        ${total("SUBTOTAL LESS DISCOUNT", money(L.lessDiscountSen))}
        ${total("TAX RATE", L.taxRate)}
        ${total("TOTAL TAX", money(L.taxSen))}
        ${total("SHIPPING/HANDLING", "0.00")}
        <tr><td style="padding:10px;text-align:right;font-weight:bold;font-size:14px">Paid</td><td style="padding:10px 8px;text-align:right;font-weight:bold;font-size:14px;border-top:2px solid #111;border-bottom:2px solid #111">MYR ${money(L.paidSen)}</td></tr>
      </table>
    </td>
  </tr></table>
</td></tr>
<tr><td style="padding:24px 28px 18px;text-align:center;font-style:italic;font-size:12px;color:#333">${esc(COMPANY.footer)}</td></tr>
<tr><td style="background:${COMPANY.red};height:20px"></td></tr>
</table></body></html>`;
}

export function receiptEmailText(r: ReceiptData): string {
  const L = receiptLayout(r);
  return [
    "OFFICIAL RECEIPT",
    COMPANY.name,
    COMPANY.regNo,
    ...COMPANY.address,
    "",
    `Date: ${L.date}`,
    `RECEIPT NO. ${L.receiptNo}`,
    "",
    "BILL TO",
    ...L.billTo,
    "",
    ...L.items.map((i) => `${i.description}  ${i.qty} x ${money(i.unitSen)} = ${money(i.totalSen)}`),
    "",
    `SUBTOTAL: ${money(L.subtotalSen)}`,
    `DISCOUNT: ${L.discountSen ? money(L.discountSen) : "-"}`,
    `SUBTOTAL LESS DISCOUNT: ${money(L.lessDiscountSen)}`,
    `TAX RATE: ${L.taxRate}`,
    `TOTAL TAX: ${money(L.taxSen)}`,
    "SHIPPING/HANDLING: 0.00",
    `Paid: MYR ${money(L.paidSen)}`,
    "",
    COMPANY.paymentNote,
    ...COMPANY.bank,
    "",
    COMPANY.footer,
  ].join("\n");
}
