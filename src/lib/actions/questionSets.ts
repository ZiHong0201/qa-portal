"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { FormState } from "./auth";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}

const setSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional(),
  grades: z.array(z.string().trim().min(1)).min(1, "Select at least one grade."),
  subject: z.string().trim().min(1, "Select a subject."),
  simulationUrl: z
    .string()
    .trim()
    .url("Enter a valid simulation URL.")
    .startsWith("https://", "Simulation URL must start with https://")
    .max(2000)
    .optional(),
});

// Grade/subject are admin-managed master data (see /admin/master-data),
// not a fixed enum, so membership is checked against the DB at write time
// instead of via z.enum.
async function validateGradesAndSubject(grades: string[], subject: string): Promise<string | null> {
  const [gradeCount, subjectExists] = await Promise.all([
    prisma.grade.count({ where: { name: { in: grades } } }),
    prisma.subject.findUnique({ where: { name: subject } }),
  ]);
  if (gradeCount !== grades.length) return "Select valid grades.";
  if (!subjectExists) return "Select a valid subject.";
  return null;
}

export async function createQuestionSet(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdmin();

  const parsed = setSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    grades: formData.getAll("grades"),
    subject: formData.get("subject"),
    simulationUrl: formData.get("simulationUrl") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const validationError = await validateGradesAndSubject(parsed.data.grades, parsed.data.subject);
  if (validationError) return { error: validationError };

  const set = await prisma.questionSet.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      subject: parsed.data.subject,
      simulationUrl: parsed.data.simulationUrl || null,
      createdById: session.user.id,
      grades: { create: parsed.data.grades.map((grade) => ({ grade })) },
    },
  });

  revalidatePath("/admin/sets");
  redirect(`/admin/sets/${set.id}`);
}

export async function updateQuestionSet(
  setId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const parsed = setSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    grades: formData.getAll("grades"),
    subject: formData.get("subject"),
    simulationUrl: formData.get("simulationUrl") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const validationError = await validateGradesAndSubject(parsed.data.grades, parsed.data.subject);
  if (validationError) return { error: validationError };

  await prisma.$transaction([
    prisma.questionSet.update({
      where: { id: setId },
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        subject: parsed.data.subject,
        simulationUrl: parsed.data.simulationUrl || null,
      },
    }),
    prisma.questionSetGrade.deleteMany({ where: { questionSetId: setId } }),
    prisma.questionSetGrade.createMany({
      data: parsed.data.grades.map((grade) => ({ questionSetId: setId, grade })),
    }),
  ]);

  revalidatePath("/admin/sets");
  revalidatePath(`/admin/sets/${setId}`);
  redirect(`/admin/sets/${setId}`);
}

export async function toggleQuestionSetActive(setId: string, isActive: boolean) {
  await requireAdmin();
  await prisma.questionSet.update({ where: { id: setId }, data: { isActive } });
  revalidatePath("/admin/sets");
  revalidatePath(`/admin/sets/${setId}`);
}

export async function deleteQuestionSet(setId: string) {
  await requireAdmin();

  const count = await prisma.submission.count({ where: { question: { questionSetId: setId } } });
  if (count > 0) {
    throw new Error(
      "This set already has student submissions and cannot be deleted. Deactivate it instead."
    );
  }

  await prisma.questionSet.delete({ where: { id: setId } });
  revalidatePath("/admin/sets");
}
