import { prisma } from "@/lib/prisma";

export type RankedStudent = {
  id: string;
  name: string;
  grade: string | null;
  points: number;
  rank: number;
};

// Ranked on marks earned from answering questions, not on the spendable
// balance shown in the nav - otherwise redeeming a gift (or collecting a daily
// check-in bonus) would move students around a board that's meant to reflect
// how they're doing on the questions.
export async function getRankedStudents(): Promise<RankedStudent[]> {
  const [earnedRows, students] = await Promise.all([
    prisma.submission.groupBy({
      by: ["studentId"],
      where: { status: { in: ["CORRECT", "APPROVED"] } },
      _sum: { pointsAwarded: true },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, name: true, grade: true },
    }),
  ]);

  const earnedById = new Map(earnedRows.map((r) => [r.studentId, r._sum.pointsAwarded ?? 0]));

  const sorted = students
    .map((s) => ({ ...s, points: earnedById.get(s.id) ?? 0 }))
    .filter((s) => s.points > 0)
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  // Standard competition ranking, so tied students share a place (1, 2, 2, 4).
  let previousPoints: number | null = null;
  let previousRank = 0;
  return sorted.map((s, i) => {
    const rank = s.points === previousPoints ? previousRank : i + 1;
    previousPoints = s.points;
    previousRank = rank;
    return { ...s, rank };
  });
}
