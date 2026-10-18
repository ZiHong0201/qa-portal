import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { BANDS, type FeePlan, MAX_MONTHS, MAX_TAX_BP, buildPlans, planFor, quote, taxOn } from "@/lib/fee-plans";
import { type PaymentMethod, isMonthKey, parseCharges, parseSubjects } from "@/lib/fees";
import { RECEIPT_COPY_TO, sendMail } from "@/lib/mailer";
import { type ReceiptData, receiptEmailHtml, receiptEmailText, receiptSubject } from "@/lib/receipt";

export type Result = { error?: string; success?: string };

function isUniqueConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2002") return true;
  // libsql reports a unique conflict as P2039 rather than P2002.
  return error.code === "P2039" && /UNIQUE constraint failed/i.test(error.message);
}

// ---- prices -----------------------------------------------------------------

export async function loadFeePlans(): Promise<FeePlan[]> {
  const rows = await prisma.feePrice.findMany({ orderBy: [{ band: "asc" }, { subjects: "asc" }] });
  return buildPlans(rows);
}

export type PriceInput = {
  band: string;
  subjects: number;
  monthlySen: number | null;
  promoMonths: number | null;
  promoSen: number | null;
};

/**
 * Sets one row of the price list - adding it if new. A promotion needs both
 * its length and its price, or neither.
 */
export async function savePrice(input: PriceInput): Promise<Result> {
  if (!BANDS.some((b) => b.key === input.band)) return { error: "Unknown grade group." };
  if (!Number.isInteger(input.subjects) || input.subjects < 1 || input.subjects > 20) {
    return { error: "Number of subjects must be between 1 and 20." };
  }
  if (input.monthlySen === null || input.monthlySen <= 0) return { error: "Enter the monthly price, such as 80." };
  const hasMonths = input.promoMonths !== null;
  const hasPrice = input.promoSen !== null;
  if (hasMonths !== hasPrice) return { error: "A promotion needs both its months and its price - or leave both blank." };
  if (hasMonths && (!Number.isInteger(input.promoMonths) || input.promoMonths! < 2 || input.promoMonths! > MAX_MONTHS)) {
    return { error: `Promotion months must be between 2 and ${MAX_MONTHS}.` };
  }
  if (hasPrice && input.promoSen! <= 0) return { error: "Enter the promotional price, such as 459." };

  const data = {
    monthlySen: input.monthlySen,
    promoMonths: input.promoMonths,
    promoSen: input.promoSen,
  };
  await prisma.feePrice.upsert({
    where: { band_subjects: { band: input.band, subjects: input.subjects } },
    create: { band: input.band, subjects: input.subjects, ...data },
    update: data,
  });
  return { success: "Saved." };
}

export async function deletePrice(band: string, subjects: number): Promise<Result> {
  const { count } = await prisma.feePrice.deleteMany({ where: { band, subjects } });
  return count ? { success: "Removed." } : { error: "That row is already gone." };
}

// ---- extra charges and tax --------------------------------------------------

export type ExtraCharge = { id: string; label: string; amountSen: number };

/** The one-off charges a receipt can tick, oldest first - the material fee leads. */
export async function listExtraCharges(): Promise<ExtraCharge[]> {
  const rows = await prisma.feeExtra.findMany({ orderBy: [{ createdAt: "asc" }, { key: "asc" }] });
  return rows.map((r) => ({ id: r.key, label: r.label, amountSen: r.amountSen }));
}

function checkCharge(label: string, amountSen: number | null): { name: string } | { error: string } {
  const name = label.trim().replace(/\s+/g, " ");
  if (!name) return { error: "Give the charge a name." };
  if (name.length > 80) return { error: "Keep the name under 80 characters." };
  if (amountSen === null || amountSen <= 0) return { error: "Enter the amount, such as 30." };
  return { name };
}

export async function saveExtraCharge(id: string, label: string, amountSen: number | null): Promise<Result> {
  const checked = checkCharge(label, amountSen);
  if ("error" in checked) return checked;
  const { count } = await prisma.feeExtra.updateMany({ where: { key: id }, data: { label: checked.name, amountSen: amountSen! } });
  return count ? { success: "Saved." } : { error: "That charge is gone." };
}

export async function addExtraCharge(label: string, amountSen: number | null): Promise<Result> {
  const checked = checkCharge(label, amountSen);
  if ("error" in checked) return checked;
  await prisma.feeExtra.create({ data: { key: crypto.randomUUID(), label: checked.name, amountSen: amountSen! } });
  return { success: `${checked.name} added.` };
}

/** Receipts keep the charges they were made with, so old ones are untouched. */
export async function deleteExtraCharge(id: string): Promise<Result> {
  const { count } = await prisma.feeExtra.deleteMany({ where: { key: id } });
  return count ? { success: "Removed." } : { error: "That charge is already gone." };
}

const TAX_KEY = "taxRateBp";

/** The tax rate a new receipt starts with, in basis points (600 = 6.00%). */
export async function loadTaxRateBp(): Promise<number> {
  const row = await prisma.feeSetting.findUnique({ where: { key: TAX_KEY } });
  return row ? Number(row.value) || 0 : 0;
}

export async function saveTaxRateBp(bp: number | null): Promise<Result> {
  if (bp === null || !Number.isInteger(bp) || bp < 0 || bp > MAX_TAX_BP) {
    return { error: "Enter a rate from 0 to 100, such as 6 or 8.5." };
  }
  await prisma.feeSetting.upsert({ where: { key: TAX_KEY }, create: { key: TAX_KEY, value: String(bp) }, update: { value: String(bp) } });
  return { success: "Saved." };
}

// ---- subjects ---------------------------------------------------------------

export async function listFeeSubjects(): Promise<{ id: string; name: string }[]> {
  return prisma.feeSubject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export async function addFeeSubject(name: string): Promise<Result> {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return { error: "Enter the subject's name." };
  if (trimmed.length > 60) return { error: "Keep the name under 60 characters." };
  try {
    await prisma.feeSubject.create({ data: { name: trimmed } });
  } catch (e) {
    if (isUniqueConflict(e)) return { error: `${trimmed} is already on the list.` };
    throw e;
  }
  return { success: `${trimmed} added.` };
}

/** Receipts keep the subject names they were made with, so old ones are untouched. */
export async function deleteFeeSubject(id: string): Promise<Result> {
  const { count } = await prisma.feeSubject.deleteMany({ where: { id } });
  return count ? { success: "Subject removed." } : { error: "That subject is already gone." };
}

// ---- receipts ---------------------------------------------------------------

export type ReceiptView = ReceiptData & {
  id: string;
  receiptNo: string;
  createdAt: Date;
  sentAt: Date | null;
  sendError: string | null;
  voidedAt: Date | null;
  voidReason: string | null;
};

type ReceiptRow = Awaited<ReturnType<typeof prisma.feeReceipt.findFirstOrThrow>>;

function toView(r: ReceiptRow): ReceiptView {
  return { ...r, subjects: parseSubjects(r.subjects), extras: parseCharges(r.extras) };
}

export async function getReceipts(where: Prisma.FeeReceiptWhereInput, take?: number): Promise<ReceiptView[]> {
  const rows = await prisma.feeReceipt.findMany({ where, orderBy: { createdAt: "desc" }, take });
  return rows.map(toView);
}

export async function getReceipt(id: string): Promise<ReceiptView | null> {
  const row = await prisma.feeReceipt.findUnique({ where: { id } });
  return row && toView(row);
}

export type ReceiptInput = {
  name: string;
  email: string;
  grade: string;
  subjects: string[];
  startMonth: string;
  months: number;
  method: PaymentMethod;
  paidOn: string;
  note: string | null;
  /** The extra charges ticked, by id - priced from the list here, not the browser. */
  extraIds: string[];
  /** The tax rate for this receipt, in basis points (600 = 6.00%). */
  taxRateBp: number;
  /** A discount on top of any promotion, in sen, and why. */
  extraDiscountSen: number;
  discountNote: string | null;
};

/**
 * Checks a receipt and prices it from the price table - never from an amount
 * sent by the browser. Shared by the preview and by the save, so what the
 * admin checked is what gets saved.
 */
export async function priceReceipt(input: ReceiptInput): Promise<{ error: string } | { data: ReceiptData }> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) return { error: "Enter the student's name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  const [plans, charges] = await Promise.all([loadFeePlans(), listExtraCharges()]);
  if (!planFor(plans, input.grade)) return { error: "Choose the student's grade." };
  if (!isMonthKey(input.startMonth)) return { error: "Choose the first month this pays for." };
  const subjects = [...new Set(input.subjects)].sort();
  if (subjects.length && (await prisma.feeSubject.count({ where: { name: { in: subjects } } })) !== subjects.length) {
    return { error: "One of the subjects is no longer on the list. Untick it and tick again." };
  }
  const price = quote(plans, input.grade, subjects.length, input.months);
  if ("error" in price) return { error: price.error };
  const ticked = [...new Set(input.extraIds)];
  const extras = charges.filter((c) => ticked.includes(c.id)).map((c) => ({ label: c.label, amountSen: c.amountSen }));
  if (extras.length !== ticked.length) return { error: "One of the extra charges is no longer on the list. Untick it." };
  if (!Number.isInteger(input.taxRateBp) || input.taxRateBp < 0 || input.taxRateBp > MAX_TAX_BP) {
    return { error: "Enter a tax rate from 0 to 100." };
  }
  const extraSen = extras.reduce((t, e) => t + e.amountSen, 0);
  const beforeDiscount = price.amountSen + extraSen;
  if (!Number.isInteger(input.extraDiscountSen) || input.extraDiscountSen < 0) {
    return { error: "Enter the additional discount as an amount, such as 20." };
  }
  if (input.extraDiscountSen > beforeDiscount) {
    return { error: `The discount is more than the RM${(beforeDiscount / 100).toFixed(2)} being charged.` };
  }
  // Tax on SUBTOTAL LESS DISCOUNT, as on the centre's template.
  const taxSen = taxOn(beforeDiscount - input.extraDiscountSen, input.taxRateBp);
  return {
    data: {
      receiptNo: null,
      name,
      email,
      grade: input.grade,
      subjects,
      startMonth: input.startMonth,
      months: input.months,
      normalSen: price.normalSen,
      amountSen: beforeDiscount - input.extraDiscountSen + taxSen,
      priceNote: price.priceNote,
      extras,
      extraSen,
      taxRateBp: input.taxRateBp,
      taxSen,
      extraDiscountSen: input.extraDiscountSen,
      discountNote: input.extraDiscountSen ? input.discountNote : null,
      method: input.method,
      paidOn: input.paidOn,
      note: input.note,
    },
  };
}

/**
 * Saves the receipt under the next number, then emails it. Saved first, so an
 * email that fails leaves a receipt to send again rather than a payment with
 * no record.
 */
export async function createReceipt(
  input: ReceiptInput,
  adminId: string
): Promise<{ error: string } | { receiptId: string; sent: boolean }> {
  const priced = await priceReceipt(input);
  if ("error" in priced) return priced;
  const d = priced.data;

  // One running sequence of four-digit numbers - 0001, 0002 and so on -
  // counting up from RECEIPT_NUMBER_BEFORE_FIRST. Two admins saving at the
  // same moment could pick the same number; the unique index refuses the
  // second, which takes the next.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const row = await prisma.$transaction(async (tx) => {
        const n = (await lastReceiptNumber(tx)) + 1 + attempt;
        return tx.feeReceipt.create({
          data: {
            name: d.name,
            email: d.email,
            grade: d.grade,
            subjects: JSON.stringify(d.subjects),
            startMonth: d.startMonth,
            months: d.months,
            normalSen: d.normalSen,
            amountSen: d.amountSen,
            priceNote: d.priceNote,
            extras: JSON.stringify(d.extras),
            extraSen: d.extraSen,
            taxRateBp: d.taxRateBp,
            taxSen: d.taxSen,
            extraDiscountSen: d.extraDiscountSen,
            discountNote: d.discountNote,
            method: d.method,
            paidOn: d.paidOn,
            note: d.note,
            receiptNo: formatReceiptNo(n),
            createdById: adminId,
          },
        });
      });
      const sent = await sendReceipt(row.id);
      return { receiptId: row.id, sent: !sent.error };
    } catch (e) {
      if (isUniqueConflict(e) && attempt < 2) continue;
      throw e;
    }
  }
  return { error: "Could not save the receipt. Try again." };
}

/** The last number given; receipts are numbered from the one after this. */
export const RECEIPT_NUMBER_BEFORE_FIRST = 0;

/** 5 -> "0005". Past 9999 it simply grows a digit. */
export function formatReceiptNo(n: number): string {
  return String(n).padStart(4, "0");
}

async function lastReceiptNumber(tx: Prisma.TransactionClient): Promise<number> {
  const rows = await tx.$queryRaw<{ n: number | bigint | null }[]>`
    SELECT MAX(CAST(receiptNo AS INTEGER)) AS n FROM FeeReceipt WHERE receiptNo NOT GLOB '*[^0-9]*'`;
  return Math.max(RECEIPT_NUMBER_BEFORE_FIRST, Number(rows[0]?.n ?? 0));
}

/** Emails a saved receipt to its address, with a blind copy to the centre. */
export async function sendReceipt(id: string): Promise<Result> {
  const receipt = await getReceipt(id);
  if (!receipt) return { error: "Receipt not found." };
  if (receipt.voidedAt) return { error: "This receipt is void, so it is not sent." };
  try {
    await sendMail({
      to: receipt.email,
      bcc: RECEIPT_COPY_TO,
      subject: receiptSubject(receipt),
      html: receiptEmailHtml(receipt),
      text: receiptEmailText(receipt),
    });
  } catch (e) {
    const message = (e instanceof Error ? e.message : String(e)).slice(0, 500);
    await prisma.feeReceipt.update({ where: { id }, data: { sendError: message } });
    return { error: `The receipt is saved, but the email did not go: ${message}` };
  }
  await prisma.feeReceipt.update({ where: { id }, data: { sentAt: new Date(), sendError: null } });
  return { success: `Sent to ${receipt.email}, with a copy to ${RECEIPT_COPY_TO}.` };
}

export async function voidReceipt(id: string, reason: string, adminId: string): Promise<Result> {
  const trimmed = reason.trim();
  if (!trimmed) return { error: "Give a reason for voiding the receipt." };
  if (trimmed.length > 300) return { error: "Keep the reason under 300 characters." };
  const { count } = await prisma.feeReceipt.updateMany({
    where: { id, voidedAt: null },
    data: { voidedAt: new Date(), voidReason: trimmed, voidedById: adminId },
  });
  return count ? { success: "Receipt voided." } : { error: "That receipt is already void." };
}
