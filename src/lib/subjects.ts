import { prisma } from "@/lib/prisma";

// Subjects are admin-managed master data (see /admin/master-data), not a
// fixed list - this reads the current set for use in <select> options and
// server-side validation.
export async function getSubjectNames(): Promise<string[]> {
  const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
  return subjects.map((s) => s.name);
}
