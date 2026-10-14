"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { SUSPENSION_REASON_MAX } from "@/lib/suspension-rules";

/** savedAt lets the form tell "just saved" apart from "never submitted". */
export type SuspendState = { error?: string; savedAt?: number };

/**
 * Suspending and restoring student accounts. Admin only: this is a decision
 * about fees and conduct, not teaching, so teachers see a suspension but
 * cannot make or lift one.
 *
 * Nothing about the student is deleted or changed besides these three
 * columns. Lifting a suspension puts them back exactly where they were -
 * marks, points, cat and all.
 */

const reasonSchema = z
  .string()
  .trim()
  .min(1, "Give a reason - the student will see it.")
  .max(SUSPENSION_REASON_MAX, `Keep the reason to ${SUSPENSION_REASON_MAX} characters.`);

export async function suspendStudent(
  studentId: string,
  _prev: SuspendState,
  formData: FormData
): Promise<SuspendState> {
  const session = await requireAdmin();

  const reason = reasonSchema.safeParse(formData.get("reason"));
  if (!reason.success) return { error: reason.error.issues[0].message };

  const student = await prisma.user.findFirst({
    where: { id: studentId, role: "STUDENT" },
    select: { suspendedAt: true },
  });
  if (!student) return { error: "Student not found." };

  await prisma.user.update({
    where: { id: studentId },
    data: {
      suspensionReason: reason.data,
      // Changing the reason on an account already suspended keeps the date it
      // started, so "since" stays true.
      suspendedAt: student.suspendedAt ?? new Date(),
      suspendedById: session.user.id,
    },
  });

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/students");
  return { savedAt: Date.now() };
}

export async function liftSuspension(studentId: string): Promise<void> {
  await requireAdmin();
  await prisma.user.updateMany({
    where: { id: studentId, role: "STUDENT" },
    data: { suspendedAt: null, suspensionReason: null, suspendedById: null },
  });
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/students");
}
