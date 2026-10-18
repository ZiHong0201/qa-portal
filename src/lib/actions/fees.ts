"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";
import { dayKey } from "@/lib/check-in";
import { isPaymentMethod } from "@/lib/fees";
import type { ReceiptData } from "@/lib/receipt";
import {
  type ReceiptInput,
  type Result,
  createReceipt,
  createStudentAccount,
  deleteStudentAccount,
  priceReceipt,
  sendReceipt,
  setGrade,
  voidReceipt,
} from "@/lib/fees.server";

// Fee pages and the portal's student pages read the same students, so any
// change here refreshes both.
function refresh() {
  revalidatePath("/payment", "layout");
  revalidatePath("/admin/students", "layout");
  revalidatePath("/dashboard", "layout");
}

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");
const subjectsOf = (formData: FormData) => formData.getAll("subjects").map(String);

// ---- student accounts -------------------------------------------------------

export async function addStudent(_prev: Result, formData: FormData): Promise<Result> {
  await requireAdmin();
  const r = await createStudentAccount({
    name: text(formData.get("name")),
    email: text(formData.get("email")),
    password: text(formData.get("password")),
    grade: text(formData.get("grade")),
    subjects: subjectsOf(formData),
  });
  if (r.error) return r;
  refresh();
  redirect(`/payment/students/${r.studentId}?created=1`);
}

export async function removeStudent(studentId: string): Promise<Result> {
  await requireAdmin();
  const r = await deleteStudentAccount(studentId);
  if (r.error) return r;
  refresh();
  redirect("/payment/students?deleted=1");
}

export async function saveGrade(studentId: string, _prev: Result, formData: FormData): Promise<Result> {
  await requireAdmin();
  const r = await setGrade(studentId, text(formData.get("grade")));
  refresh();
  return r;
}

// ---- receipts ---------------------------------------------------------------

function receiptInput(formData: FormData): ReceiptInput | { error: string } {
  const method = formData.get("method");
  if (!isPaymentMethod(method)) return { error: "Choose how it was paid." };
  const paidOn = text(formData.get("paidOn"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) return { error: "Enter the date it was paid." };
  if (paidOn > dayKey()) return { error: "The payment date cannot be in the future." };
  return {
    name: text(formData.get("name")),
    email: text(formData.get("email")),
    grade: text(formData.get("grade")),
    subjects: subjectsOf(formData),
    startMonth: text(formData.get("startMonth")),
    months: Number(formData.get("months")),
    method,
    paidOn,
    note: text(formData.get("note")).trim().slice(0, 300) || null,
  };
}

/** The receipt as it will be sent, priced on the server, for the admin to check. */
export async function previewReceipt(formData: FormData): Promise<{ error: string } | { data: ReceiptData }> {
  await requireAdmin();
  const input = receiptInput(formData);
  if ("error" in input) return input;
  return priceReceipt(input);
}

export async function sendNewReceipt(formData: FormData): Promise<{ error: string }> {
  const session = await requireAdmin();
  const input = receiptInput(formData);
  if ("error" in input) return input;
  const r = await createReceipt(input, session.user.id);
  if ("error" in r) return r;
  refresh();
  redirect(`/payment/receipts/${r.receiptId}?${r.sent ? "sent" : "unsent"}=1`);
}

export async function resendReceipt(id: string): Promise<Result> {
  await requireAdmin();
  const r = await sendReceipt(id);
  refresh();
  return r;
}

export async function cancelReceipt(id: string, reason: string): Promise<Result> {
  const session = await requireAdmin();
  const r = await voidReceipt(id, reason, session.user.id);
  refresh();
  return r;
}
