"use server";

import { z } from "zod";
import { revalidatePath, updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { FormState } from "./auth";


const nameSchema = z.string().trim().min(1, "Name is required").max(100);

export async function createGrade(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const existing = await prisma.grade.findUnique({ where: { name: parsed.data } });
  if (existing) {
    return { error: "That grade already exists." };
  }

  const count = await prisma.grade.count();
  await prisma.grade.create({ data: { name: parsed.data, order: count } });

  updateTag(CACHE_TAGS.masterData);
  revalidatePath("/admin/master-data");
  return {};
}

export async function deleteGrade(gradeId: string) {
  await requireAdmin();

  const grade = await prisma.grade.findUnique({ where: { id: gradeId } });
  if (!grade) return;

  const [setCount, studentCount] = await Promise.all([
    prisma.questionSetGrade.count({ where: { grade: grade.name } }),
    prisma.user.count({ where: { role: "STUDENT", grade: grade.name } }),
  ]);
  if (setCount > 0 || studentCount > 0) {
    throw new Error(
      `"${grade.name}" is still used by ${setCount} question set(s) and ${studentCount} student(s) and can't be deleted.`
    );
  }

  await prisma.grade.delete({ where: { id: gradeId } });
  updateTag(CACHE_TAGS.masterData);
  revalidatePath("/admin/master-data");
}

export async function createSubject(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const existing = await prisma.subject.findUnique({ where: { name: parsed.data } });
  if (existing) {
    return { error: "That subject already exists." };
  }

  await prisma.subject.create({ data: { name: parsed.data } });

  updateTag(CACHE_TAGS.masterData);
  revalidatePath("/admin/master-data");
  return {};
}

export async function deleteSubject(subjectId: string) {
  await requireAdmin();

  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) return;

  const [setCount, studentCount] = await Promise.all([
    prisma.questionSet.count({ where: { subject: subject.name } }),
    prisma.studentSubject.count({ where: { subject: subject.name } }),
  ]);
  if (setCount > 0 || studentCount > 0) {
    throw new Error(
      `"${subject.name}" is still used by ${setCount} question set(s) and ${studentCount} student(s) and can't be deleted.`
    );
  }

  // A teacher assigned the subject is no reason to keep it: nothing would be
  // left in it for them to edit. Their assignment goes with it.
  await prisma.$transaction([
    prisma.teacherSubject.deleteMany({ where: { subject: subject.name } }),
    prisma.subject.delete({ where: { id: subjectId } }),
  ]);
  updateTag(CACHE_TAGS.masterData);
  revalidatePath("/admin/master-data");
}
