"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { FormState } from "./auth";

/**
 * Staff accounts - teachers and admins.
 *
 * Admin-only throughout, including the listing: an account that can grade work
 * and adjust points is a lever on every student's marks, so who holds one is
 * the admin's business rather than a teacher's. An account that can make more
 * admins, doubly so.
 *
 * Staff are plain users with role TEACHER or ADMIN - no grade, no subjects.
 * Those describe what a student studies, not what a teacher may touch; staff
 * see every set regardless.
 *
 * Two rules run through every function here, and both exist to stop the portal
 * being locked away from its owner:
 *
 *   - the last admin cannot be deleted, demoted, or have their access revoked,
 *     because an admin is the only account that can create another one; and
 *   - nobody can do any of those things to themselves, which is the same
 *     mistake made by hand instead of by arithmetic.
 */

const ROLES = ["TEACHER", "ADMIN"] as const;

const staffSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(ROLES, { message: "Choose teacher or admin." }),
});

export async function createStaff(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const parsed = staffSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 10), role },
  });

  revalidatePath("/admin/staff");
  redirect("/admin/staff?created=1");
}

// Same fields, except that leaving the password blank keeps the current one -
// editing a name should not force the admin to invent a new password and go
// and tell someone about it.
const updateSchema = staffSchema.extend({
  password: z.union([z.string().min(8, "Password must be at least 8 characters"), z.literal("")]),
});

export async function updateStaff(
  staffId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdmin();

  const parsed = updateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password") ?? "",
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password, role } = parsed.data;

  const staff = await staffOrNull(staffId);
  // Guarding the role as well as the id: this must not become a way to rename
  // a student, or to quietly reset their password.
  if (!staff) return { error: "Staff account not found." };

  if (staff.role === "ADMIN" && role !== "ADMIN") {
    const blocked = await blockedFromLosingAdmin(staffId, session.user.id);
    if (blocked) return { error: blocked };
  }

  const clash = await prisma.user.findUnique({ where: { email } });
  if (clash && clash.id !== staffId) {
    return { error: "An account with that email already exists." };
  }

  await prisma.user.update({
    where: { id: staffId },
    data: {
      name,
      email,
      role,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
  });

  revalidatePath("/admin/staff");
  redirect("/admin/staff?saved=1");
}

/**
 * Removes a staff account entirely.
 *
 * Anyone who has authored or marked anything cannot be deleted: question sets,
 * questions, catalogue items, notices and point adjustments all record who
 * created them, and the database refuses to orphan those rows. That is the
 * right answer rather than an obstacle - deleting the author of a live
 * question set would take the set with it. Such an account has its access
 * revoked instead, which keeps the authorship intact.
 */
export async function deleteStaff(staffId: string): Promise<{ error?: string }> {
  const session = await requireAdmin();

  const staff = await staffOrNull(staffId);
  if (!staff) return { error: "Staff account not found." };

  if (staffId === session.user.id) {
    return { error: "You cannot delete your own account." };
  }
  if (staff.role === "ADMIN") {
    const blocked = await blockedFromLosingAdmin(staffId, session.user.id);
    if (blocked) return { error: blocked };
  }

  const authored = await authoredCount(staffId);
  if (authored > 0) {
    return {
      error:
        `This account has created ${authored} item${authored === 1 ? "" : "s"} ` +
        `(sets, questions, catalogue entries, notices, point adjustments or markings) ` +
        `and cannot be deleted without deleting those too. Revoke their access instead.`,
    };
  }

  await prisma.user.delete({ where: { id: staffId } });
  revalidatePath("/admin/staff");
  return {};
}

/**
 * Revokes staff access without touching what they made.
 *
 * Demoting to STUDENT is what the schema allows - there is no "disabled" flag -
 * and it fails safe: the account keeps working but sees only the student side,
 * with no sets to grade and no points to adjust. A demoted account has no
 * enrolments, so it has nothing to answer either.
 */
export async function revokeStaff(staffId: string): Promise<{ error?: string }> {
  const session = await requireAdmin();

  const staff = await staffOrNull(staffId);
  if (!staff) return { error: "Staff account not found." };

  if (staff.role === "ADMIN") {
    const blocked = await blockedFromLosingAdmin(staffId, session.user.id);
    if (blocked) return { error: blocked };
  }

  await prisma.user.update({ where: { id: staffId }, data: { role: "STUDENT" } });
  revalidatePath("/admin/staff");
  return {};
}

async function staffOrNull(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) return null;
  return user;
}

/**
 * Why this account may not stop being an admin, or null if it may.
 *
 * Covers the two ways to end up locked out: removing the only admin, and
 * removing yourself. The second is refused even when another admin remains,
 * because it is nearly always a misclick on the wrong row - an admin who
 * genuinely wants to step down can be demoted by the colleague taking over,
 * which also proves that colleague's access works before the first one gives
 * theirs up.
 */
async function blockedFromLosingAdmin(
  targetId: string,
  actingId: string
): Promise<string | null> {
  if (targetId === actingId) {
    return "You cannot remove your own admin access. Ask the other admin to do it.";
  }
  const admins = await prisma.user.count({ where: { role: "ADMIN" } });
  if (admins <= 1) {
    return "This is the only admin account. Create another admin first - otherwise nobody would be left who can.";
  }
  return null;
}

async function authoredCount(userId: string): Promise<number> {
  const [sets, questions, items, adjustments, notices, popups, reviews] = await Promise.all([
    prisma.questionSet.count({ where: { createdById: userId } }),
    prisma.question.count({ where: { createdById: userId } }),
    prisma.catalogueItem.count({ where: { createdById: userId } }),
    prisma.pointAdjustment.count({ where: { createdById: userId } }),
    prisma.announcement.count({ where: { createdById: userId } }),
    prisma.popupAd.count({ where: { createdById: userId } }),
    // Submission.reviewer is optional, so a delete would not be refused here -
    // it would quietly null the field and lose the record of who marked the
    // work. Counted with the rest so that never happens silently.
    prisma.submission.count({ where: { reviewerId: userId } }),
  ]);
  return sets + questions + items + adjustments + notices + popups + reviews;
}
