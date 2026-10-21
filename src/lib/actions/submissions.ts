"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/permissions";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuspended, suspendedError } from "@/lib/suspension";
import { getUiLang } from "@/lib/i18n.server";
import { setsText } from "@/lib/text/sets";
import { Prisma } from "@/generated/prisma/client";
import type { FormState } from "./auth";

/**
 * The second of two answers to the same question, refused by the unique index
 * on (questionId, studentId).
 *
 * P2002 is Prisma's code for that, but through the libsql adapter it never
 * arrives: the violation comes back as P2039, a generic "database error"
 * carrying SQLite's own message. Checking only P2002 meant a double submit -
 * two tabs, or a double tap that raced - reached the student as an error page
 * instead of "You have already answered this question." (The data was always
 * safe; the index refused the second row either way.) P2002 is kept for the
 * day the adapter starts mapping it properly.
 */
function isDuplicateSubmission(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2002") return true;
  return error.code === "P2039" && /UNIQUE constraint failed/i.test(error.message);
}

export type SubmitAnswerState = FormState & {
  result?: {
    status: "CORRECT" | "INCORRECT" | "PENDING";
    pointsAwarded: number;
    correctAnswerText: string | null;
    explanation: string | null;
  };
};

// Deliberately does NOT call revalidatePath: this route can render 60+
// questions, and any revalidation here forced Next.js to re-fetch/re-render
// the whole set (plus the shared nav's points balance) on every single
// answer, making "Submit answer" take 2-3+ seconds. The FlashcardDeck and
// nav update themselves from `result` / next real navigation instead, so
// submitting feels instant. The set-list page's "answered" counts and the
// nav's points balance go stale until the student's next full navigation -
// an acceptable tradeoff for how much faster each answer feels.
/**
 * Integrity signals travel with the answer. They come from the browser, so a
 * determined student could forge them - which is exactly why they are context
 * for a teacher rather than anything the portal acts on automatically. Values
 * are clamped so a bad or hostile number cannot poison the admin view.
 */
function readSignals(formData: FormData) {
  const num = (key: string, max: number) => {
    const raw = Number(formData.get(key));
    if (!Number.isFinite(raw) || raw < 0) return 0;
    return Math.min(Math.round(raw), max);
  };
  return {
    // A day is far longer than any real answer; anything above it is a tab
    // left open overnight, which says nothing useful.
    secondsTaken: num("secondsTaken", 86_400),
    awayCount: num("awayCount", 1_000),
    awaySeconds: num("awaySeconds", 86_400),
    pasteAttempts: num("pasteAttempts", 1_000),
  };
}

export async function submitAnswer(
  questionId: string,
  _prevState: SubmitAnswerState,
  formData: FormData
): Promise<SubmitAnswerState> {
  // Every message below is read by the student, so it comes back in the
  // language they picked for the portal.
  const lang = await getUiLang();
  const t = setsText[lang];
  const session = await auth();
  if (!session) return { error: t.mustLogIn };
  if (await isSuspended(session.user.id)) return { error: suspendedError(lang) };

  const signals = readSignals(formData);

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { choices: true },
  });
  if (!question || !question.isActive) {
    return { error: t.questionUnavailable };
  }

  if (question.type === "MULTIPLE_CHOICE") {
    const choiceId = formData.get("choiceId");
    if (!choiceId || typeof choiceId !== "string") {
      return { error: t.selectAnswer };
    }
    const choice = question.choices.find((c) => c.id === choiceId);
    if (!choice) return { error: t.invalidChoice };

    try {
      await prisma.submission.create({
        data: {
          questionId,
          studentId: session.user.id,
          selectedChoiceId: choice.id,
          status: choice.isCorrect ? "CORRECT" : "INCORRECT",
          pointsAwarded: choice.isCorrect ? question.points : 0,
          ...signals,
        },
      });
    } catch (error) {
      if (isDuplicateSubmission(error)) {
        return { error: t.alreadyAnswered };
      }
      throw error;
    }

    return {
      result: {
        status: choice.isCorrect ? "CORRECT" : "INCORRECT",
        pointsAwarded: choice.isCorrect ? question.points : 0,
        correctAnswerText: question.choices.find((c) => c.isCorrect)?.text ?? null,
        explanation: question.explanation,
      },
    };
  }

  const answerText = formData.get("answerText");
  if (!answerText || typeof answerText !== "string" || answerText.trim().length === 0) {
    return { error: t.enterAnswer };
  }

  try {
    await prisma.submission.create({
      data: {
        questionId,
        studentId: session.user.id,
        answerText: answerText.trim(),
        status: "PENDING",
        pointsAwarded: 0,
        ...signals,
      },
    });
  } catch (error) {
    if (isDuplicateSubmission(error)) {
      return { error: t.alreadyAnswered };
    }
    throw error;
  }

  return { result: { status: "PENDING", pointsAwarded: 0, correctAnswerText: null, explanation: null } };
}

export async function reviewSubmission(submissionId: string, formData: FormData) {
  // Marking is the teaching job, so teachers do it too. The reviewer is
  // recorded on the submission either way, which is what makes it answerable
  // later for who awarded the marks.
  const session = await requireStaff();

  const decision = formData.get("decision");
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    throw new Error("Invalid decision");
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { question: true },
  });
  if (!submission) throw new Error("Submission not found");
  if (submission.status !== "PENDING") throw new Error("Already reviewed");

  const rawPoints = Number(formData.get("points"));
  const points =
    decision === "APPROVED"
      ? Math.min(Math.max(Number.isFinite(rawPoints) ? rawPoints : 0, 0), submission.question.points)
      : 0;

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: decision,
      pointsAwarded: points,
      reviewedAt: new Date(),
      reviewerId: session.user.id,
    },
  });

  revalidatePath("/admin/review");
  revalidatePath("/dashboard");
}
