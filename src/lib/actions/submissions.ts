"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { FormState } from "./auth";

export async function submitAnswer(
  questionId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await auth();
  if (!session) return { error: "You must be logged in." };

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { choices: true },
  });
  if (!question || !question.isActive) {
    return { error: "This question is not available." };
  }

  const existing = await prisma.submission.findUnique({
    where: { questionId_studentId: { questionId, studentId: session.user.id } },
  });
  if (existing) return { error: "You have already answered this question." };

  if (question.type === "MULTIPLE_CHOICE") {
    const choiceId = formData.get("choiceId");
    if (!choiceId || typeof choiceId !== "string") {
      return { error: "Select an answer." };
    }
    const choice = question.choices.find((c) => c.id === choiceId);
    if (!choice) return { error: "Invalid choice." };

    await prisma.submission.create({
      data: {
        questionId,
        studentId: session.user.id,
        selectedChoiceId: choice.id,
        status: choice.isCorrect ? "CORRECT" : "INCORRECT",
        pointsAwarded: choice.isCorrect ? question.points : 0,
      },
    });
  } else {
    const answerText = formData.get("answerText");
    if (!answerText || typeof answerText !== "string" || answerText.trim().length === 0) {
      return { error: "Enter an answer." };
    }

    await prisma.submission.create({
      data: {
        questionId,
        studentId: session.user.id,
        answerText: answerText.trim(),
        status: "PENDING",
        pointsAwarded: 0,
      },
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/sets/${question.questionSetId}`);
  return {};
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
