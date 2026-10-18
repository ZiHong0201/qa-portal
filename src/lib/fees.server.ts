import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { planFor, quote } from "@/lib/fee-plans";
import { type PaymentMethod, isMonthKey, parseSubjects } from "@/lib/fees";
import { RECEIPT_COPY_TO, sendMail } from "@/lib/mailer";
import {
  RECEIPT_LOGO_CID,
  type ReceiptData,
  receiptEmailHtml,
  receiptEmailText,
  receiptSubject,
} from "@/lib/receipt";
import { RECEIPT_LOGO_PNG_BASE64 } from "@/lib/receipt-logo";

export type Result = { error?: string; success?: string };

function isUniqueConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2002") return true;
  // libsql reports a unique conflict as P2039 rather than P2002.
  return error.code === "P2039" && /UNIQUE constraint failed/i.test(error.message);
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
  return { ...r, subjects: parseSubjects(r.subjects) };
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
  if (!planFor(input.grade)) return { error: "Choose the student's grade." };
  if (!isMonthKey(input.startMonth)) return { error: "Choose the first month this pays for." };
  const subjects = [...new Set(input.subjects)].sort();
  if (subjects.length && (await prisma.feeSubject.count({ where: { name: { in: subjects } } })) !== subjects.length) {
    return { error: "One of the subjects is no longer on the list. Untick it and tick again." };
  }
  const price = quote(input.grade, subjects.length, input.months);
  if ("error" in price) return { error: price.error };
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
      amountSen: price.amountSen,
      priceNote: price.priceNote,
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

  // One running sequence. Two admins saving at the same moment could pick the
  // same number; the unique index refuses the second, which takes the next.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const row = await prisma.$transaction(async (tx) => {
        const n = (await tx.feeReceipt.count()) + 1 + attempt;
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
            method: d.method,
            paidOn: d.paidOn,
            note: d.note,
            receiptNo: `YH-${String(n).padStart(5, "0")}`,
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
      // Inside the message rather than linked, so it shows even where a mail
      // app holds back pictures from the web.
      attachments: [
        { filename: "logo.png", content: Buffer.from(RECEIPT_LOGO_PNG_BASE64, "base64"), cid: RECEIPT_LOGO_CID },
      ],
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
