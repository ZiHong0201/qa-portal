"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveDiagram, deleteDiagram } from "@/lib/uploads";
import type { FormState } from "./auth";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}

const questionSchema = z.object({
  body: z.string().trim().min(1, "Question text is required").max(5000),
  points: z.coerce.number().int().min(1, "Marks must be at least 1").max(1000),
  explanation: z.string().trim().max(2000).optional(),
});

function parseChoices(formData: FormData) {
  const texts = formData.getAll("choiceText") as string[];
  const correctIndex = formData.get("correctChoice");
  return texts
    .map((text, i) => ({ text: text.trim(), isCorrect: String(i) === correctIndex }))
    .filter((c) => c.text.length > 0);
}

async function parseDiagram(formData: FormData): Promise<{ url?: string; error?: string }> {
  const file = formData.get("diagram");
  if (!(file instanceof File) || file.size === 0) return {};

  try {
    const url = await saveDiagram(file);
    return { url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save diagram." };
  }
}

export async function createQuestion(
  setId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdmin();

  const set = await prisma.questionSet.findUnique({ where: { id: setId } });
  if (!set) return { error: "Question set not found." };

  const parsed = questionSchema.safeParse({
    body: formData.get("body"),
    points: formData.get("points"),
    explanation: formData.get("explanation") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { body, points, explanation } = parsed.data;

  const choices = parseChoices(formData);
  if (choices.length < 2) {
    return { error: "Questions need at least 2 options." };
  }
  if (!choices.some((c) => c.isCorrect)) {
    return { error: "Select which option is correct." };
  }

  const diagram = await parseDiagram(formData);
  if (diagram.error) return { error: diagram.error };

  await prisma.question.create({
    data: {
      body,
      points,
      explanation: explanation || null,
      type: "MULTIPLE_CHOICE",
      diagramUrl: diagram.url,
      questionSetId: setId,
      createdById: session.user.id,
      choices: {
        create: choices.map((c, i) => ({ text: c.text, isCorrect: c.isCorrect, order: i })),
      },
    },
  });

  revalidatePath(`/admin/sets/${setId}`);
  redirect(`/admin/sets/${setId}`);
}

export async function updateQuestion(
  questionId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const existing = await prisma.question.findUnique({
    where: { id: questionId },
    include: { _count: { select: { submissions: true } } },
  });
  if (!existing) return { error: "Question not found." };
  if (existing._count.submissions > 0) {
    return {
      error:
        "This question already has student submissions and can no longer be edited. Deactivate it and create a new question instead.",
    };
  }

  const parsed = questionSchema.safeParse({
    body: formData.get("body"),
    points: formData.get("points"),
    explanation: formData.get("explanation") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { body, points, explanation } = parsed.data;

  const choices = parseChoices(formData);
  if (choices.length < 2) {
    return { error: "Questions need at least 2 options." };
  }
  if (!choices.some((c) => c.isCorrect)) {
    return { error: "Select which option is correct." };
  }

  const diagram = await parseDiagram(formData);
  if (diagram.error) return { error: diagram.error };

  if (diagram.url) {
    await deleteDiagram(existing.diagramUrl);
  }

  await prisma.$transaction([
    prisma.choice.deleteMany({ where: { questionId } }),
    prisma.question.update({
      where: { id: questionId },
      data: {
        body,
        points,
        explanation: explanation || null,
        diagramUrl: diagram.url ?? existing.diagramUrl,
        choices: {
          create: choices.map((c, i) => ({ text: c.text, isCorrect: c.isCorrect, order: i })),
        },
      },
    }),
  ]);

  revalidatePath(`/admin/sets/${existing.questionSetId}`);
  redirect(`/admin/sets/${existing.questionSetId}`);
}

export async function deleteQuestion(questionId: string) {
  await requireAdmin();

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) return;

  const count = await prisma.submission.count({ where: { questionId } });
  if (count > 0) {
    throw new Error(
      "This question already has student submissions and cannot be deleted. Deactivate it instead."
    );
  }

  await prisma.question.delete({ where: { id: questionId } });
  await deleteDiagram(question.diagramUrl);
  revalidatePath(`/admin/sets/${question.questionSetId}`);
}

export async function toggleQuestionActive(questionId: string, isActive: boolean) {
  await requireAdmin();
  const question = await prisma.question.update({
    where: { id: questionId },
    data: { isActive },
  });
  revalidatePath(`/admin/sets/${question.questionSetId}`);
}

// Unlike updateQuestion, this doesn't touch grading (body/points/choices), so
// it stays editable even after a question has submissions - explanations are
// usually added *because* students got something wrong.
export async function updateQuestionExplanation(questionId: string, formData: FormData) {
  await requireAdmin();

  const explanation = (formData.get("explanation") as string | null)?.trim() || null;
  if (explanation && explanation.length > 2000) {
    throw new Error("Explanation is too long (max 2000 characters).");
  }

  const question = await prisma.question.update({
    where: { id: questionId },
    data: { explanation },
  });
  revalidatePath(`/admin/sets/${question.questionSetId}`);
}
