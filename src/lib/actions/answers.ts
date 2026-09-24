"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/**
 * Clearing a student's answers so they can sit the work again.
 *
 * Deleting the submissions is the whole mechanism: a question counts as
 * answered because a Submission row exists for it, and the set is complete
 * when every question has one. There is no separate "completed" flag to keep
 * in step, so removing the rows reopens the set exactly as if it had never
 * been touched.
 *
 * The marks go with them. That is deliberate rather than an oversight - the
 * points balance is derived from the submissions, so leaving the marks behind
 * would pay a student twice for the same questions, once now and again on the
 * redo. It does mean a student who has already spent what they earned can end
 * up with a negative balance until they re-earn it, which is why the UI shows
 * the resulting figure before the teacher commits to it.
 *
 * Staff, not admin: deciding a student should try again is a teaching call.
 */

export type ClearResult = {
  error?: string;
  cleared?: number;
  marksWithdrawn?: number;
};

export async function clearStudentAnswers(
  studentId: string,
  /** A single set, or null for everything the student has ever answered. */
  questionSetId: string | null
): Promise<ClearResult> {
  const session = await requireStaff();

  const student = await prisma.user.findFirst({
    where: { id: studentId, role: "STUDENT" },
    select: { id: true, name: true },
  });
  if (!student) return { error: "Student not found." };

  let set: { id: string; title: string } | null = null;
  if (questionSetId) {
    set = await prisma.questionSet.findUnique({
      where: { id: questionSetId },
      select: { id: true, title: true },
    });
    if (!set) return { error: "Question set not found." };
  }

  const where = {
    studentId,
    ...(questionSetId ? { question: { questionSetId } } : {}),
  };

  // Read the marks before deleting: once the rows are gone there is nothing
  // left to total, and the log is the only record that they existed.
  const doomed = await prisma.submission.findMany({
    where,
    select: { pointsAwarded: true },
  });
  if (doomed.length === 0) {
    return { error: "There are no answers to clear." };
  }
  const marksWithdrawn = doomed.reduce((sum, s) => sum + s.pointsAwarded, 0);

  await prisma.$transaction([
    prisma.submission.deleteMany({ where }),
    prisma.answerReset.create({
      data: {
        studentId: student.id,
        studentName: student.name,
        questionSetId: set?.id ?? null,
        questionSetTitle: set?.title ?? null,
        clearedById: session.user.id,
        clearedByName: session.user.name ?? null,
        answersCleared: doomed.length,
        marksWithdrawn,
      },
    }),
  ]);

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/students");
  // The student's own pages read the same rows, so they have to be refreshed
  // too or the set still shows as finished until something else invalidates.
  revalidatePath("/dashboard/sets");
  if (questionSetId) revalidatePath(`/dashboard/sets/${questionSetId}`);
  revalidatePath("/dashboard");

  return { cleared: doomed.length, marksWithdrawn };
}
