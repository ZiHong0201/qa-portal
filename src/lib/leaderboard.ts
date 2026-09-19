import { prisma } from "@/lib/prisma";

// A submission awaiting teacher review hasn't been judged right or wrong yet,
// so it is left out of the accuracy denominator rather than counted against
// the student.
const CORRECT_STATUSES = ["CORRECT", "APPROVED"] as const;
const GRADED_STATUSES = ["CORRECT", "APPROVED", "INCORRECT", "REJECTED"] as const;

export type RankedStudent = {
  id: string;
  name: string;
  grade: string | null;
  points: number;
  /** Answers marked correct. */
  correct: number;
  /** Answers that have been marked at all, so correct + incorrect. */
  graded: number;
  /** Percentage of graded answers that were correct, or null if none yet. */
  accuracy: number | null;
  rank: number;
};

// Ranked on marks earned from answering questions, not on the spendable
// balance shown in the nav - otherwise redeeming a gift (or collecting a daily
// check-in bonus) would move students around a board that's meant to reflect
// how they're doing on the questions.
//
// Accuracy is shown alongside but deliberately does not affect the ranking:
// it rewards care rather than volume, and mixing the two into one order would
// make the board hard to read.
export async function getRankedStudents(): Promise<RankedStudent[]> {
  const [statusRows, students] = await Promise.all([
    // One row per student per status, so marks, correct count and graded count
    // all come from a single round trip.
    prisma.submission.groupBy({
      by: ["studentId", "status"],
      _sum: { pointsAwarded: true },
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, name: true, grade: true },
    }),
  ]);

  const totals = new Map<string, { points: number; correct: number; graded: number }>();
  for (const row of statusRows) {
    const entry = totals.get(row.studentId) ?? { points: 0, correct: 0, graded: 0 };
    const count = row._count._all;
    if ((CORRECT_STATUSES as readonly string[]).includes(row.status)) {
      entry.points += row._sum.pointsAwarded ?? 0;
      entry.correct += count;
    }
    if ((GRADED_STATUSES as readonly string[]).includes(row.status)) {
      entry.graded += count;
    }
    totals.set(row.studentId, entry);
  }

  const sorted = students
    .map((s) => {
      const t = totals.get(s.id) ?? { points: 0, correct: 0, graded: 0 };
      return {
        ...s,
        points: t.points,
        correct: t.correct,
        graded: t.graded,
        accuracy: t.graded > 0 ? Math.round((t.correct / t.graded) * 100) : null,
      };
    })
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
