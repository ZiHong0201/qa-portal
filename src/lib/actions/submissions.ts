"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { FormState } from "./auth";

function isDuplicateSubmission(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
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
export async function submitAnswer(
  questionId: string,
  _prevState: SubmitAnswerState,
  formData: FormData
): Promise<SubmitAnswerState> {
  const session = await auth();
  if (!session) return { error: "You must be logged in." };

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { choices: true },
  });
  if (!question || !question.isActive) {
    return { error: "This question is not available." };
  }

  if (question.type === "MULTIPLE_CHOICE") {
    const choiceId = formData.get("choiceId");
    if (!choiceId || typeof choiceId !== "string") {
      return { error: "Select an answer." };
    }
    const choice = question.choices.find((c) => c.id === choiceId);
    if (!choice) return { error: "Invalid choice." };

    try {
      await prisma.submission.create({
        data: {
          questionId,
          studentId: session.user.id,
          selectedChoiceId: choice.id,
          status: choice.isCorrect ? "CORRECT" : "INCORRECT",
          pointsAwarded: choice.isCorrect ? question.points : 0,
        },
      });
    } catch (error) {
      if (isDuplicateSubmission(error)) {
        return { error: "You have already answered this question." };
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
    return { error: "Enter an answer." };
  }

  try {
    await prisma.submission.create({
      data: {
        questionId,
        studentId: session.user.id,
        answerText: answerText.trim(),
        status: "PENDING",
        pointsAwarded: 0,
      },
    });
  } catch (error) {
    if (isDuplicateSubmission(error)) {
      return { error: "You have already answered this question." };
    }
    throw error;
  }

  return { result: { status: "PENDING", pointsAwarded: 0, correctAnswerText: null, explanation: null } };
}

export async function reviewSubmission(submissionId: string, formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

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
