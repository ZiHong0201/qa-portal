"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import {
  canAssignCentre,
  requireStaff,
  requireStudentAccess,
  visibleCentreIds,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { FormState } from "./auth";

/**
 * The centre chosen on a student form: "" for none yet. An admin may leave a
 * student without one; a teacher must pick one of their own centres, or the
 * student would vanish from their list the moment it was saved.
 */
async function parseStudentCentre(
  session: Session,
  value: FormDataEntryValue | null
): Promise<{ centreId: string | null } | { error: string }> {
  const centreId = typeof value === "string" && value !== "" ? value : null;
  const visible = await visibleCentreIds(session);
  if (!canAssignCentre(visible, centreId)) {
    return { error: centreId === null ? "Select a centre." : "Select one of your centres." };
  }
  if (centreId !== null && !(await prisma.centre.findUnique({ where: { id: centreId } }))) {
    return { error: "Select a valid centre." };
  }
  return { centreId };
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
  const session = await requireStaff();

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

  const centre = await parseStudentCentre(session, formData.get("centreId"));
  if ("error" in centre) return { error: centre.error };

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
      centreId: centre.centreId,
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
  const { session, student } = await requireStudentAccess(studentId);
  if (!student) return { error: "Student not found." };

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

  const centre = await parseStudentCentre(session, formData.get("centreId"));
  if ("error" in centre) return { error: centre.error };

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
      data: { name, email, grade, centreId: centre.centreId, ...(passwordHash ? { passwordHash } : {}) },
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
  const { student } = await requireStudentAccess(studentId);
  if (!student) return;

  await prisma.$transaction([
    prisma.submission.deleteMany({ where: { studentId } }),
    prisma.redemption.deleteMany({ where: { studentId } }),
    prisma.pointAdjustment.deleteMany({ where: { studentId } }),
    // Check-ins block the delete otherwise: their foreign key restricts.
    prisma.checkIn.deleteMany({ where: { studentId } }),
    prisma.studentSubject.deleteMany({ where: { studentId } }),
    // Their feedback is kept: the database unlinks it from the account.
    prisma.user.delete({ where: { id: studentId } }),
  ]);

  revalidatePath("/admin/students");
  redirect("/admin/students?deleted=1");
}

export async function updateStudentGrade(studentId: string, formData: FormData) {
  const { student } = await requireStudentAccess(studentId);
  if (!student) return;

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
  const { student } = await requireStudentAccess(studentId);
  if (!student) return;

  const subjects = [...new Set(formData.getAll("subjects").filter((s): s is string => typeof s === "string"))];
  const validCount = subjects.length
    ? await prisma.subject.count({ where: { name: { in: subjects } } })
    : 0;
  if (subjects.length && validCount !== subjects.length) {
    throw new Error("Invalid subject.");
  }

  await prisma.$transaction([
    prisma.studentSubject.deleteMany({ where: { studentId } }),
    prisma.studentSubject.createMany({
      data: subjects.map((subject) => ({ studentId, subject })),
    }),
  ]);

  revalidatePath("/admin/students");
}

/** The centre picker on the students list: "" takes the student out of any. */
export async function updateStudentCentre(studentId: string, formData: FormData) {
  const { session, student } = await requireStudentAccess(studentId);
  if (!student) return;

  const centre = await parseStudentCentre(session, formData.get("centreId"));
  if ("error" in centre) throw new Error(centre.error);

  await prisma.user.update({ where: { id: studentId }, data: { centreId: centre.centreId } });

  revalidatePath("/admin/students");
}
