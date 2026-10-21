"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/permissions";
import { type Result, resetLinkOrigin } from "@/lib/password.server";
import { approveAccountRequest, rejectAccountRequest, requestAccount } from "@/lib/account-request.server";

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

export async function requestStudentAccount(_prev: Result, formData: FormData): Promise<Result> {
  return requestAccount(text(formData.get("name")), text(formData.get("email")));
}

export async function approveRequest(requestId: string, _prev: Result, formData: FormData): Promise<Result> {
  await requireStaff();
  const h = await headers();
  const result = await approveAccountRequest(
    requestId,
    { name: formData.get("name"), grade: formData.get("grade"), subjects: formData.getAll("subjects") },
    // The same rule as reset links: only ever one of our own sites.
    resetLinkOrigin(h.get("host"), h.get("x-forwarded-proto"))
  );
  if (result.error) return result;
  // The approved row leaves the list, taking its form with it, so the
  // confirmation has to be the page's rather than the form's.
  revalidatePath("/admin/students");
  redirect("/admin/students/requests?approved=1");
}

export async function rejectRequest(requestId: string) {
  await requireStaff();
  await rejectAccountRequest(requestId);
  revalidatePath("/admin/students");
  revalidatePath("/admin/students/requests");
}
