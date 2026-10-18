"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";
import { dayKey } from "@/lib/check-in";
import { isPaymentMethod, parseRinggit } from "@/lib/fees";
import type { ReceiptData } from "@/lib/receipt";
import {
  type ReceiptInput,
  type Result,
  createReceipt,
  addFeeSubject,
  deleteFeeSubject,
  deletePrice,
  saveExtraCharge,
  savePrice,
  priceReceipt,
  sendReceipt,
  voidReceipt,
} from "@/lib/fees.server";

function refresh() {
  revalidatePath("/payment", "layout");
}

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");
const subjectsOf = (formData: FormData) => formData.getAll("subjects").map(String);

// ---- prices -----------------------------------------------------------------

/** "" -> null; otherwise an amount in sen, or NaN when it is not one. */
function amountOf(v: FormDataEntryValue | null): number | null {
  const raw = text(v).trim();
  if (raw === "") return null;
  return parseRinggit(raw) ?? Number.NaN;
}

export async function savePriceRow(band: string, _prev: Result, formData: FormData): Promise<Result> {
  await requireAdmin();
  const monthlySen = amountOf(formData.get("monthly"));
  const promoSen = amountOf(formData.get("promoPrice"));
  if (Number.isNaN(monthlySen) || Number.isNaN(promoSen)) return { error: "Enter amounts such as 80 or 80.50." };
  const months = text(formData.get("promoMonths")).trim();
  const r = await savePrice({
    band,
    subjects: Number(formData.get("subjects")),
    monthlySen,
    promoMonths: months === "" ? null : Number(months),
    promoSen,
  });
  refresh();
  return r;
}

export async function saveExtra(_prev: Result, formData: FormData): Promise<Result> {
  await requireAdmin();
  const amount = amountOf(formData.get("amount"));
  if (Number.isNaN(amount)) return { error: "Enter an amount such as 30." };
  const r = await saveExtraCharge(text(formData.get("label")), amount);
  refresh();
  return r;
}

export async function removePriceRow(band: string, subjects: number): Promise<Result> {
  await requireAdmin();
  const r = await deletePrice(band, subjects);
  refresh();
  return r;
}

// ---- subjects ---------------------------------------------------------------

export async function addSubject(_prev: Result, formData: FormData): Promise<Result> {
  await requireAdmin();
  const r = await addFeeSubject(text(formData.get("name")));
  refresh();
  return r;
}

export async function removeSubject(id: string): Promise<Result> {
  await requireAdmin();
  const r = await deleteFeeSubject(id);
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
    includeExtra: formData.get("includeExtra") === "on",
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
