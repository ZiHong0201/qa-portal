import type { Session } from "next-auth";
import { auth } from "@/auth";

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
