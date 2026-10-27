import { prisma } from "@/lib/prisma";

/**
 * Which library simulations a student may open: active, tagged with their
 * grade, and in one of their subjects - the same rule as question sets.
 * Null when the student has no grade or subjects yet, and so sees none.
 */
export async function studentSimulationScope(userId: string) {
  const student = await prisma.user.findUnique({
    where: { id: userId },
    select: { grade: true, questionLanguage: true, subjects: { select: { subject: true } } },
  });
  const subjects = student?.subjects.map((s) => s.subject) ?? [];
  if (!student?.grade || subjects.length === 0) return null;
  return {
    grade: student.grade,
    subjects,
    // A student who reads their sets in BM gets the BM simulation first too.
    prefersMalay: student.questionLanguage === "ms",
    where: {
      isActive: true,
      grades: { some: { grade: student.grade } },
      subject: { in: subjects },
    },
  };
}
