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
  subject: z.string().trim().min(1, "Select a subject."),
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
    subject: formData.get("subject"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { name, email, password, grade, subject } = parsed.data;

  const [existing, gradeExists, subjectExists] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.grade.findUnique({ where: { name: grade } }),
    prisma.subject.findUnique({ where: { name: subject } }),
  ]);
  if (existing) {
    return { error: "An account with that email already exists." };
  }
  if (!gradeExists) return { error: "Select a valid grade." };
  if (!subjectExists) return { error: "Select a valid subject." };

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { name, email, passwordHash, role: "STUDENT", grade, subject },
  });

  revalidatePath("/admin/students");
  redirect("/admin/students?created=1");
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

export async function updateStudentSubject(studentId: string, formData: FormData) {
  await requireAdmin();

  const subject = formData.get("subject");
  if (
    typeof subject !== "string" ||
    !(await prisma.subject.findUnique({ where: { name: subject } }))
  ) {
    throw new Error("Invalid subject.");
  }

  await prisma.user.updateMany({
    where: { id: studentId, role: "STUDENT" },
    data: { subject },
  });

  revalidatePath("/admin/students");
}
