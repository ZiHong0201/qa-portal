"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canAssignCentre, requireStaff, visibleCentreIds } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { type Result, authLang, resetLinkOrigin } from "@/lib/password.server";
import { approveAccountRequest, rejectAccountRequest, requestAccount } from "@/lib/account-request.server";

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

export async function requestStudentAccount(_prev: Result, formData: FormData): Promise<Result> {
  return requestAccount(
    text(formData.get("name")),
    text(formData.get("email")),
    await authLang(),
    text(formData.get("centreId"))
  );
}

/**
 * A teacher deals with the requests naming one of their centres; a request
 * naming none, or another centre, waits for an admin or that centre's teacher.
 */
async function requireRequestAccess(requestId: string) {
  const session = await requireStaff();
  const visible = await visibleCentreIds(session);
  if (visible !== null) {
    const request = await prisma.accountRequest.findUnique({ where: { id: requestId }, select: { centreId: true } });
    if (request && !canAssignCentre(visible, request.centreId)) throw new Error("Forbidden");
  }
  return { session, visible };
}

export async function approveRequest(requestId: string, _prev: Result, formData: FormData): Promise<Result> {
  const { visible } = await requireRequestAccess(requestId);
  const centreId = text(formData.get("centreId")) || null;
  if (!canAssignCentre(visible, centreId)) {
    return { error: centreId === null ? "Select a centre." : "Select one of your centres." };
  }
  const h = await headers();
  const result = await approveAccountRequest(
    requestId,
    {
      name: formData.get("name"),
      grade: formData.get("grade"),
      subjects: formData.getAll("subjects"),
      centreId,
    },
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
  await requireRequestAccess(requestId);
  await rejectAccountRequest(requestId);
  revalidatePath("/admin/students");
  revalidatePath("/admin/students/requests");
}
