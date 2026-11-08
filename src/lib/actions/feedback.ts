"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteQuestion, moveQuestion, saveQuestion, setQuestionHidden } from "@/lib/feedback-questions.server";
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

  // Each answer arrives as a_<question id>.
  const answers: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of formData) {
    if (key.startsWith("a_")) answers[key.slice(2)] = value;
  }

  const result = await sendFeedback(
    session.user.id,
    {
      answers,
      // No opt-in box any more: the form says every message may be quoted and
      // asks how to name them, starting on anonymous. A student can still take
      // one back afterwards with "Don't quote this".
      mayQuote: true,
      credit: formData.get("credit"),
      shortName: formData.get("shortName"),
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

// ---- admin: the form's questions --------------------------------------------------

function questionsChanged() {
  revalidatePath("/admin/feedback", "layout");
  revalidatePath("/dashboard/feedback");
}

export async function saveFeedbackQuestion(id: string | null, _prev: Result, formData: FormData): Promise<Result> {
  await requireAdmin();
  const result = await saveQuestion(id, {
    labelEn: formData.get("labelEn"),
    labelZh: formData.get("labelZh"),
    hintEn: formData.get("hintEn"),
    hintZh: formData.get("hintZh"),
    type: formData.get("type"),
    required: formData.get("required") === "on",
    useAsRole: formData.get("useAsRole") === "on",
    choices: formData.get("choices"),
  });
  if (result.error) return result;
  questionsChanged();
  // Back to the plain list: closes the editor, and empties the "add" form.
  redirect("/admin/feedback/questions");
}

export async function moveFeedbackQuestion(id: string, direction: -1 | 1) {
  await requireAdmin();
  await moveQuestion(id, direction);
  questionsChanged();
}

export async function hideFeedbackQuestion(id: string, hidden: boolean) {
  await requireAdmin();
  await setQuestionHidden(id, hidden);
  questionsChanged();
}

export async function deleteFeedbackQuestion(id: string) {
  await requireAdmin();
  await deleteQuestion(id);
  questionsChanged();
}
