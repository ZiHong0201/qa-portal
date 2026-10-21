import type { Session } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canEditSubject } from "@/lib/subject-access";

export { canEditSubject };

/**
 * Who can do what.
 *
 * The whole split lives here rather than as a `role !== "ADMIN"` check
 * repeated across twenty files. That was fine with two roles; with three, a
 * check left un-updated is a teacher who can reset the portal, and it would
 * look exactly like every other line around it.
 *
 * TEACHER covers the academic work - question sets, grading, students and
 * their points, and the integrity signals. ADMIN keeps the portal's own
 * configuration: the catalogue, announcements, the virtual cat, master data,
 * the reset, and creating staff accounts. The division is roughly "teaching"
 * against "running the service".
 *
 * Within the academic work, a teacher is further tied to subjects: they may
 * change only the question sets (and those sets' questions) in subjects an
 * admin has given them, so a Science teacher cannot slip and edit the Maths
 * sets. They still read every set, and still grade and manage every student.
 * A teacher with no subjects assigned edits nothing until an admin gives them
 * some - failing closed, rather than handing a new account the whole bank.
 */

/**
 * Anyone who works here - admin or teacher. Never a student.
 *
 * Typed as a predicate so a caller that has checked does not then have to
 * assert the session is non-null: passing the check is the proof.
 */
export function isStaff(session: Session | null): session is Session {
  return session?.user.role === "ADMIN" || session?.user.role === "TEACHER";
}

export function isAdmin(session: Session | null): session is Session {
  return session?.user.role === "ADMIN";
}

/**
 * Admin-only areas. A teacher reaching one of these is redirected rather than
 * shown an error: they have not done anything wrong, the page simply is not
 * theirs.
 *
 * Listed as prefixes because the guard has to cover nested routes too -
 * /admin/catalogue/new is every bit as admin-only as /admin/catalogue.
 */
export const ADMIN_ONLY_PREFIXES = [
  "/admin/catalogue",
  "/admin/announcements",
  "/admin/pet",
  "/admin/master-data",
  "/admin/reset",
  "/admin/staff",
  // Students may write about their teachers, and choosing testimonials for
  // the website is marketing - running the service, not teaching.
  "/admin/feedback",
];

export function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Guards a server action for staff. Throws rather than returning a value, so
 * a caller that forgets to check the result still fails closed.
 */
export async function requireStaff(): Promise<Session> {
  const session = (await auth()) as Session | null;
  if (!isStaff(session)) throw new Error("Forbidden");
  return session;
}

/** Guards a server action for admins only. */
export async function requireAdmin(): Promise<Session> {
  const session = (await auth()) as Session | null;
  if (!isAdmin(session)) throw new Error("Forbidden");
  return session;
}

/**
 * The subjects whose question sets this person may change, or null for every
 * subject (admins). Anyone else gets an empty list.
 *
 * Read from the database on each call rather than carried in the session, so
 * an admin taking a subject away takes effect on the teacher's next click
 * instead of at their next login.
 */
export async function editableSubjects(session: Session): Promise<string[] | null> {
  if (session.user.role === "ADMIN") return null;
  if (session.user.role !== "TEACHER") return [];
  const rows = await prisma.teacherSubject.findMany({
    where: { teacherId: session.user.id },
    select: { subject: true },
  });
  return rows.map((r) => r.subject);
}

/** editableSubjects for whoever is viewing the page. */
export async function currentEditableSubjects(): Promise<string[] | null> {
  const session = (await auth()) as Session | null;
  return isStaff(session) ? editableSubjects(session) : [];
}

/**
 * Guards a server action that changes question sets or questions in the given
 * subject(s). Pass both the old and new subject when a set is being moved: a
 * teacher may neither take a set out of another subject nor put one into it.
 */
export async function requireSubjectAccess(...subjects: string[]): Promise<Session> {
  const session = await requireStaff();
  await assertSubjectAccess(session, subjects);
  return session;
}

async function assertSubjectAccess(session: Session, subjects: string[]) {
  const editable = await editableSubjects(session);
  const refused = subjects.find((s) => !canEditSubject(editable, s));
  if (refused !== undefined) {
    throw new Error(
      `You can't change ${refused} question sets. Ask an admin to add ${refused} to your subjects.`
    );
  }
}

/**
 * requireSubjectAccess for a set known only by id. Returns the set, or null
 * when it does not exist - the caller decides what a missing set means.
 */
export async function requireSetAccess(setId: string) {
  const session = await requireStaff();
  const set = await prisma.questionSet.findUnique({ where: { id: setId } });
  if (set) await assertSubjectAccess(session, [set.subject]);
  return { session, set };
}

/** requireSubjectAccess for a question, by the subject of the set it is in. */
export async function requireQuestionAccess(questionId: string) {
  const session = await requireStaff();
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { questionSet: { select: { subject: true } } },
  });
  if (question) await assertSubjectAccess(session, [question.questionSet.subject]);
  return { session, question };
}
