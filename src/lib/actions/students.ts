"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
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

const createStudentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  grade: z.string().trim().min(1, "Select a grade."),
  subjects: z.array(z.string().trim().min(1)).min(1, "Select at least one subject."),
});

export async function createStudent(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const parsed = createStudentSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    grade: formData.get("grade"),
    subjects: formData.getAll("subjects"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { name, email, password, grade, subjects } = parsed.data;

  const [existing, gradeExists, subjectCount] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.grade.findUnique({ where: { name: grade } }),
    prisma.subject.count({ where: { name: { in: subjects } } }),
  ]);
  if (existing) {
    return { error: "An account with that email already exists." };
  }
  if (!gradeExists) return { error: "Select a valid grade." };
  if (subjectCount !== subjects.length) return { error: "Select valid subjects." };

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "STUDENT",
      grade,
      subjects: { create: subjects.map((subject) => ({ subject })) },
    },
  });

  revalidatePath("/admin/students");
  redirect("/admin/students?created=1");
}

const updateStudentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.union([z.string().min(8, "Password must be at least 8 characters"), z.literal("")]),
  grade: z.string().trim().min(1, "Select a grade."),
  subjects: z.array(z.string().trim().min(1)).min(1, "Select at least one subject."),
});

export async function updateStudent(
  studentId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const parsed = updateStudentSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password") ?? "",
    grade: formData.get("grade"),
    subjects: formData.getAll("subjects"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { name, email, password, grade, subjects } = parsed.data;

  const [existing, gradeExists, subjectCount] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.grade.findUnique({ where: { name: grade } }),
    prisma.subject.count({ where: { name: { in: subjects } } }),
  ]);
  if (existing && existing.id !== studentId) {
    return { error: "An account with that email already exists." };
  }
  if (!gradeExists) return { error: "Select a valid grade." };
  if (subjectCount !== subjects.length) return { error: "Select valid subjects." };

  const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { id: studentId, role: "STUDENT" },
      data: { name, email, grade, ...(passwordHash ? { passwordHash } : {}) },
    }),
    prisma.studentSubject.deleteMany({ where: { studentId } }),
    prisma.studentSubject.createMany({
      data: subjects.map((subject) => ({ studentId, subject })),
    }),
  ]);

  revalidatePath("/admin/students");
  redirect(`/admin/students/${studentId}`);
}

export async function deleteStudent(studentId: string) {
  await requireAdmin();

  const student = await prisma.user.findFirst({ where: { id: studentId, role: "STUDENT" } });
  if (!student) return;

  await prisma.$transaction([
    prisma.submission.deleteMany({ where: { studentId } }),
    prisma.redemption.deleteMany({ where: { studentId } }),
    prisma.pointAdjustment.deleteMany({ where: { studentId } }),
    prisma.studentSubject.deleteMany({ where: { studentId } }),
    prisma.user.delete({ where: { id: studentId } }),
  ]);

  revalidatePath("/admin/students");
  redirect("/admin/students?deleted=1");
}

export async function updateStudentGrade(studentId: string, formData: FormData) {
  await requireAdmin();

  const grade = formData.get("grade");
  if (typeof grade !== "string" || !(await prisma.grade.findUnique({ where: { name: grade } }))) {
    throw new Error("Invalid grade.");
  }

  await prisma.user.updateMany({
    where: { id: studentId, role: "STUDENT" },
    data: { grade },
  });

  revalidatePath("/admin/students");
}

export async function updateStudentSubjects(studentId: string, formData: FormData) {
  await requireAdmin();

  const subjects = [...new Set(formData.getAll("subjects").filter((s): s is string => typeof s === "string"))];
  const validCount = subjects.length
    ? await prisma.subject.count({ where: { name: { in: subjects } } })
    : 0;
  if (subjects.length && validCount !== subjects.length) {
    throw new Error("Invalid subject.");
  }

  const student = await prisma.user.findFirst({ where: { id: studentId, role: "STUDENT" } });
  if (!student) return;

  await prisma.$transaction([
    prisma.studentSubject.deleteMany({ where: { studentId } }),
    prisma.studentSubject.createMany({
      data: subjects.map((subject) => ({ studentId, subject })),
    }),
  ]);

  revalidatePath("/admin/students");
}
