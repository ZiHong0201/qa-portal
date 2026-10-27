"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSimulationAccess, requireStaff, requireSubjectAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { FormState } from "./auth";

const httpsUrl = (label: string) =>
  z
    .string()
    .trim()
    .url(`Enter a valid ${label}.`)
    .startsWith("https://", `The ${label} must start with https://`)
    .max(2000);

const simulationSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional(),
  grades: z.array(z.string().trim().min(1)).min(1, "Select at least one grade."),
  subject: z.string().trim().min(1, "Select a subject."),
  chapter: z.string().trim().max(200).optional(),
  topicCode: z.string().trim().max(50).optional(),
  url: httpsUrl("simulation URL"),
  urlMs: httpsUrl("BM simulation URL").optional(),
});

function parse(formData: FormData) {
  return simulationSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    grades: formData.getAll("grades"),
    subject: formData.get("subject"),
    chapter: formData.get("chapter") || undefined,
    topicCode: formData.get("topicCode") || undefined,
    url: formData.get("url"),
    urlMs: formData.get("urlMs") || undefined,
  });
}

// Checked against master data at write time, as for question sets.
async function validateGradesAndSubject(grades: string[], subject: string): Promise<string | null> {
  const [gradeCount, subjectExists] = await Promise.all([
    prisma.grade.count({ where: { name: { in: grades } } }),
    prisma.subject.findUnique({ where: { name: subject } }),
  ]);
  if (gradeCount !== grades.length) return "Select valid grades.";
  if (!subjectExists) return "Select a valid subject.";
  return null;
}

function revalidateLibrary(simulationId?: string) {
  revalidatePath("/admin/simulations");
  revalidatePath("/dashboard/simulations");
  if (simulationId) revalidatePath(`/dashboard/simulations/${simulationId}`);
}

export async function createSimulation(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireStaff();

  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const validationError = await validateGradesAndSubject(parsed.data.grades, parsed.data.subject);
  if (validationError) return { error: validationError };
  await requireSubjectAccess(parsed.data.subject);

  await prisma.simulation.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      subject: parsed.data.subject,
      chapter: parsed.data.chapter || null,
      topicCode: parsed.data.topicCode || null,
      url: parsed.data.url,
      urlMs: parsed.data.urlMs || null,
      createdById: session.user.id,
      grades: { create: parsed.data.grades.map((grade) => ({ grade })) },
    },
  });

  revalidateLibrary();
  redirect(`/admin/simulations?subject=${encodeURIComponent(parsed.data.subject)}`);
}

export async function updateSimulation(
  simulationId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { simulation } = await requireSimulationAccess(simulationId);
  if (!simulation) return { error: "Simulation not found." };

  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const validationError = await validateGradesAndSubject(parsed.data.grades, parsed.data.subject);
  if (validationError) return { error: validationError };
  // The subject it is moving to - its current one was checked above.
  await requireSubjectAccess(parsed.data.subject);

  await prisma.$transaction([
    prisma.simulation.update({
      where: { id: simulationId },
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        subject: parsed.data.subject,
        chapter: parsed.data.chapter || null,
        topicCode: parsed.data.topicCode || null,
        url: parsed.data.url,
        urlMs: parsed.data.urlMs || null,
      },
    }),
    prisma.simulationGrade.deleteMany({ where: { simulationId } }),
    prisma.simulationGrade.createMany({
      data: parsed.data.grades.map((grade) => ({ simulationId, grade })),
    }),
  ]);

  revalidateLibrary(simulationId);
  redirect(`/admin/simulations?subject=${encodeURIComponent(parsed.data.subject)}`);
}

export async function toggleSimulationActive(simulationId: string, isActive: boolean) {
  const { simulation } = await requireSimulationAccess(simulationId);
  if (!simulation) return;
  await prisma.simulation.update({ where: { id: simulationId }, data: { isActive } });
  revalidateLibrary(simulationId);
}

// Nothing hangs off a simulation - no answers, no marks - so unlike a
// question set it can always be deleted outright.
export async function deleteSimulation(simulationId: string) {
  const { simulation } = await requireSimulationAccess(simulationId);
  if (!simulation) return;
  await prisma.simulation.delete({ where: { id: simulationId } });
  revalidateLibrary(simulationId);
}
