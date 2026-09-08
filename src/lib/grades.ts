import { prisma } from "@/lib/prisma";

// Grades are admin-managed master data (see /admin/master-data), not a
// fixed list - this reads the current set for use in <select> options and
// server-side validation.
export async function getGradeNames(): Promise<string[]> {
  const grades = await prisma.grade.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });
  return grades.map((g) => g.name);
}
