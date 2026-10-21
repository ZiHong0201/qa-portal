"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/permissions";
import { isSuspended, suspendedError } from "@/lib/suspension";
import { getUiLang } from "@/lib/i18n.server";
import { feedbackText } from "@/lib/text/feedback";
import type { Result } from "@/lib/password.server";
import {
  markAllFeedbackRead,
  sendFeedback,
  setFeedbackArchived,
  setFeedbackEnabled,
  setFeedbackRead,
  setFeedbackStarred,
  withdrawQuote,
} from "@/lib/feedback.server";

// ---- students -----------------------------------------------------------------

export async function sendMyFeedback(_prev: Result, formData: FormData): Promise<Result> {
  const session = await auth();
  const lang = await getUiLang();
  const t = feedbackText[lang];
  if (!session) return { error: t.needLogin };
  if (session.user.role !== "STUDENT") return { error: t.studentsOnly };
  if (await isSuspended(session.user.id)) return { error: suspendedError(lang) };

  const result = await sendFeedback(
    session.user.id,
    {
      kind: formData.get("kind"),
      message: formData.get("message"),
      mayQuote: formData.get("mayQuote") === "on",
      credit: formData.get("credit"),
      shortName: formData.get("shortName"),
      rating: formData.get("rating"),
      recommend: formData.get("recommend"),
    },
    lang
  );
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

export async function switchFeedback(enabled: boolean) {
  await requireAdmin();
  await setFeedbackEnabled(enabled);
  // The nav link and the home page banner sit on every student page.
  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin/feedback");
}

export async function archiveFeedback(id: string, archived: boolean) {
  await requireAdmin();
  await setFeedbackArchived(id, archived);
  revalidatePath("/admin/feedback");
  revalidatePath("/admin");
}
