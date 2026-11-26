"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireStudentAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { FormState } from "./auth";


const adjustmentSchema = z.object({
  amount: z.coerce
    .number()
    .int()
    .refine((n) => n !== 0, "Amount can't be zero.")
    .refine((n) => Math.abs(n) <= 1_000_000, "Amount is too large."),
  reason: z.string().trim().max(500).optional(),
});

export async function createPointAdjustment(
  studentId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { session, student } = await requireStudentAccess(studentId);
  if (!student) return { error: "Student not found." };

  const parsed = adjustmentSchema.safeParse({
    amount: formData.get("amount"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.pointAdjustment.create({
    data: {
      studentId,
      amount: parsed.data.amount,
      reason: parsed.data.reason || null,
      createdById: session.user.id,
    },
  });

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/students");
  return {};
}
