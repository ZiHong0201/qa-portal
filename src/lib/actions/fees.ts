"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/check-in";
import { isMonthKey, isPaymentMethod, parseRinggit } from "@/lib/fees";
import {
  type Result,
  adjustBill,
  createBill,
  createBillsForMonth,
  deleteBill,
  recordPayment,
  voidPayment,
} from "@/lib/fees.server";

// Every fee page reads from the same few tables, so any change refreshes the
// lot - and the portal's student page, which shows what is owed.
function refresh() {
  revalidatePath("/payment", "layout");
  revalidatePath("/admin/students/[id]", "page");
}

const noteOf = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, 300) : null;
};

// ---- fee settings -----------------------------------------------------------

/** A subject's usual monthly fee. Blank clears it, taking the subject off future bills. */
export async function setSubjectFee(subject: string, _prev: Result, formData: FormData): Promise<Result> {
  await requireAdmin();
  const raw = String(formData.get("fee") ?? "").trim();
  const sen = raw === "" ? null : parseRinggit(raw);
  if (raw !== "" && (sen === null || sen < 0)) return { error: "Enter an amount such as 80 or 80.50." };
  const { count } = await prisma.subject.updateMany({ where: { name: subject }, data: { monthlyFeeSen: sen } });
  if (!count) return { error: "Subject not found." };
  refresh();
  return { success: sen === null ? "Fee cleared." : "Saved." };
}

/** One student's own rate for a subject. Blank goes back to the usual fee. */
export async function setStudentFeeRate(
  studentId: string,
  subject: string,
  _prev: Result,
  formData: FormData
): Promise<Result> {
  await requireAdmin();
  const raw = String(formData.get("fee") ?? "").trim();
  if (raw === "") {
    await prisma.studentFeeRate.deleteMany({ where: { studentId, subject } });
    refresh();
    return { success: "Back to the usual fee." };
  }
  const sen = parseRinggit(raw);
  if (sen === null || sen < 0) return { error: "Enter an amount such as 80 or 80.50." };
  const note = noteOf(formData.get("note"));
  await prisma.studentFeeRate.upsert({
    where: { studentId_subject: { studentId, subject } },
    create: { studentId, subject, monthlyFeeSen: sen, note },
    update: { monthlyFeeSen: sen, note },
  });
  refresh();
  return { success: "Saved. It applies from the next bill made." };
}

// ---- bills ------------------------------------------------------------------

export async function createMonthBills(month: string): Promise<Result> {
  const session = await requireAdmin();
  if (!isMonthKey(month)) return { error: "Pick a month." };
  const r = await createBillsForMonth(month, session.user.id);
  refresh();
  const parts = [`${r.created} bill${r.created === 1 ? "" : "s"} created`];
  if (r.existing) parts.push(`${r.existing} already had one`);
  if (r.noFee) parts.push(`${r.noFee} skipped - no subject with a fee`);
  return { success: `${parts.join(", ")}.` };
}

export async function createStudentBill(studentId: string, month: string): Promise<Result> {
  const session = await requireAdmin();
  if (!isMonthKey(month)) return { error: "Pick a month." };
  const r = await createBill(studentId, month, session.user.id);
  refresh();
  return r;
}

export async function adjustStudentBill(billId: string, _prev: Result, formData: FormData): Promise<Result> {
  await requireAdmin();
  const raw = String(formData.get("adjustment") ?? "").trim();
  const sen = raw === "" ? 0 : parseRinggit(raw);
  if (sen === null) return { error: "Enter an amount such as -20 for a discount, or 15 for an extra." };
  const r = await adjustBill(billId, sen, noteOf(formData.get("note")));
  refresh();
  return r;
}

export async function removeBill(billId: string): Promise<Result> {
  await requireAdmin();
  const r = await deleteBill(billId);
  refresh();
  return r;
}

// ---- payments ---------------------------------------------------------------

export async function addPayment(billId: string, _prev: Result, formData: FormData): Promise<Result> {
  const session = await requireAdmin();
  const amountSen = parseRinggit(String(formData.get("amount") ?? ""));
  if (amountSen === null) return { error: "Enter the amount received, such as 150 or 150.00." };
  const method = formData.get("method");
  if (!isPaymentMethod(method)) return { error: "Choose how it was paid." };
  const paidOn = String(formData.get("paidOn") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) return { error: "Enter the date it was paid." };
  if (paidOn > dayKey()) return { error: "The payment date cannot be in the future." };

  const r = await recordPayment({
    billId,
    amountSen,
    method,
    paidOn,
    note: noteOf(formData.get("note")),
    adminId: session.user.id,
  });
  refresh();
  return r;
}

export async function cancelPayment(paymentId: string, reason: string): Promise<Result> {
  const session = await requireAdmin();
  const r = await voidPayment(paymentId, reason, session.user.id);
  refresh();
  return r;
}
