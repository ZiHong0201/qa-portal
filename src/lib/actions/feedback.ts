"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/permissions";
import { SUSPENDED_ERROR, isSuspended } from "@/lib/suspension";
import type { Result } from "@/lib/password.server";
import {
  markAllFeedbackRead,
  sendFeedback,
  setFeedbackArchived,
  setFeedbackRead,
  setFeedbackStarred,
  withdrawQuote,
} from "@/lib/feedback.server";

// ---- students -----------------------------------------------------------------

export async function sendMyFeedback(_prev: Result, formData: FormData): Promise<Result> {
  const session = await auth();
  if (!session) return { error: "You need to be logged in to send feedback." };
  if (session.user.role !== "STUDENT") return { error: "Feedback is for students only." };
  if (await isSuspended(session.user.id)) return { error: SUSPENDED_ERROR };

  const result = await sendFeedback(session.user.id, {
    kind: formData.get("kind"),
    message: formData.get("message"),
    mayQuote: formData.get("mayQuote") === "on",
    credit: formData.get("credit"),
    shortName: formData.get("shortName"),
  });
  if (result.success) {
    revalidatePath("/dashboard/feedback");
    revalidatePath("/admin/feedback");
    revalidatePath("/admin");
  }
  return result;
}

export async function stopQuotingMine(feedbackId: string) {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") return;
  // Unlike sending, taking permission back is allowed while suspended: it only
  // ever narrows what we may do with their words.
  await withdrawQuote(session.user.id, feedbackId);
  revalidatePath("/dashboard/feedback");
  revalidatePath("/admin/feedback");
}

// ---- admin ----------------------------------------------------------------------

export async function markFeedbackRead(id: string, read: boolean) {
  await requireAdmin();
  await setFeedbackRead(id, read);
  revalidatePath("/admin/feedback");
  revalidatePath("/admin");
  revalidatePath("/dashboard/feedback");
}

export async function markEveryFeedbackRead() {
  await requireAdmin();
  await markAllFeedbackRead();
  revalidatePath("/admin/feedback");
  revalidatePath("/admin");
  revalidatePath("/dashboard/feedback");
}

export async function starFeedback(id: string, starred: boolean) {
  await requireAdmin();
  // A refused star (the student withdrew a moment ago) needs no message: the
  // refreshed row simply comes back without a star button.
  await setFeedbackStarred(id, starred);
  revalidatePath("/admin/feedback");
  revalidatePath("/admin");
}

export async function archiveFeedback(id: string, archived: boolean) {
  await requireAdmin();
  await setFeedbackArchived(id, archived);
  revalidatePath("/admin/feedback");
  revalidatePath("/admin");
}
