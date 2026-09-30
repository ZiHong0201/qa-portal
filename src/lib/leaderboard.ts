import { prisma } from "@/lib/prisma";
import { dayKey, previousDayKey, weekStartKey, startOfDay } from "@/lib/check-in";

// A submission awaiting teacher review hasn't been judged right or wrong yet,
// so it is left out of the accuracy denominator rather than counted against
// the student.
const CORRECT_STATUSES = ["CORRECT", "APPROVED"] as const;
const GRADED_STATUSES = ["CORRECT", "APPROVED", "INCORRECT", "REJECTED"] as const;

// Accuracy off a handful of answers is noise: one student who got their only
// question right would sit above someone at 86% over 600. A student needs at
// least this many marked answers before they appear on the accuracy board.
export const MIN_GRADED_FOR_ACCURACY = 10;

export type StudentStats = {
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
  /** Best run of consecutive daily check-ins ever reached. */
  longestStreak: number;
  /** Consecutive days up to today - 0 once the run has been broken. */
  currentStreak: number;
  /** Days checked in during the period being shown. */
  checkInDays: number;
};

export type RankedStudent = StudentStats & { rank: number };

export type LeaderboardMetric = "points" | "accuracy" | "streak";

/**
 * "week" counts only what happened since Monday; "all" counts everything.
 *
 * The weekly board exists because an all-time board stops moving. Whoever
 * started first stays on top, and a student who joined in September can work
 * hard every day and never see their name rise. A week wipes that lead, so the
 * question it answers is the one worth asking: who put the work in lately.
 */
export type LeaderboardPeriod = "week" | "all";

// Every student with something to show for the period, without a ranking -
// callers narrow by form first and rank what's left, so the ranks always run
// 1, 2, 3 within whatever board is being shown.
export async function getStudentStats(period: LeaderboardPeriod = "all"): Promise<StudentStats[]> {
  const today = dayKey();
  const yesterday = previousDayKey(today);
  const weekStart = weekStartKey(today);

  // An answer belongs to the week it was given in. A written answer approved
  // on Tuesday for work handed in last Friday counts for last week - the
  // student did the work then, and the teacher's marking timetable should not
  // move it between weeks.
  const submittedSince = period === "week" ? { createdAt: { gte: startOfDay(weekStart) } } : {};

  const [statusRows, students, bestStreaks, recentCheckIns, periodCheckIns] = await Promise.all([
    // One row per student per status, so marks, correct count and graded count
    // all come from a single round trip.
    prisma.submission.groupBy({
      by: ["studentId", "status"],
      where: submittedSince,
      _sum: { pointsAwarded: true },
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, name: true, grade: true },
    }),
    // Each check-in row snapshots the streak it was part of, so the longest run
    // a student ever reached is just the largest of those - no need to walk
    // their history day by day.
    prisma.checkIn.groupBy({ by: ["studentId"], _max: { streak: true } }),
    // Today and yesterday are all that's needed to tell whether a run is still
    // alive, mirroring getCheckInState but for every student at once.
    prisma.checkIn.findMany({
      where: { day: { in: [today, yesterday] } },
      select: { studentId: true, day: true, streak: true },
    }),
    // Day keys sort as strings, so "since Monday" is a plain comparison.
    prisma.checkIn.groupBy({
      by: ["studentId"],
      where: period === "week" ? { day: { gte: weekStart } } : {},
      _count: { _all: true },
    }),
  ]);

  const checkInDays = new Map(periodCheckIns.map((r) => [r.studentId, r._count._all]));

  const longest = new Map(bestStreaks.map((r) => [r.studentId, r._max.streak ?? 0]));

  // A row for today always wins; yesterday's only counts while today's is
  // missing, which is the streak they still stand to extend.
  const current = new Map<string, number>();
  for (const row of recentCheckIns) {
    if (row.day === today) current.set(row.studentId, row.streak);
    else if (!current.has(row.studentId)) current.set(row.studentId, row.streak);
  }

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

  return students
    .map((s) => {
      const t = totals.get(s.id) ?? { points: 0, correct: 0, graded: 0 };
      return {
        ...s,
        points: t.points,
        correct: t.correct,
        graded: t.graded,
        accuracy: t.graded > 0 ? Math.round((t.correct / t.graded) * 100) : null,
        longestStreak: longest.get(s.id) ?? 0,
        currentStreak: current.get(s.id) ?? 0,
        checkInDays: checkInDays.get(s.id) ?? 0,
      };
    })
    // A check-in is earned without answering anything, so someone who has only
    // checked in still belongs here - rankStudents drops them from the marks
    // and accuracy boards. The all-time test uses the longest streak and the
    // weekly one this week's check-ins, so a student last seen in August does
    // not sit on this week's board with nothing next to their name.
    .filter((s) =>
      period === "week" ? s.points > 0 || s.checkInDays > 0 : s.points > 0 || s.longestStreak > 0
    );
}

// The values a board sorts on, most significant first. Two students share a
// place only when every one of these matches - name decides display order
// after that but never affects the rank.
function sortKey(s: StudentStats, metric: LeaderboardMetric, period: LeaderboardPeriod): number[] {
  if (metric === "points") return [s.points, s.accuracy ?? -1];
  // A longest-ever streak cannot be earned inside a week, so the weekly
  // version of this board counts days turned up instead: seven is the best
  // anyone can do, and everyone starts Monday on nought.
  if (metric === "streak") {
    return period === "week"
      ? [s.checkInDays, s.currentStreak, s.points]
      : [s.longestStreak, s.currentStreak, s.points];
  }
  return [s.accuracy ?? -1, s.graded, s.points];
}

function sameKey(a: number[], b: number[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Ranks a list of students by the chosen metric, using standard competition
 * ranking so tied students share a place (1, 2, 2, 4).
 *
 * Points ties are broken by accuracy, so of two students on the same marks the
 * one who needed fewer attempts to get there places higher. Accuracy ties are
 * broken by how many answers back the figure up, then by marks. Equal longest
 * streaks are separated by whose run is still going, then by marks.
 */
export function rankStudents(
  students: StudentStats[],
  metric: LeaderboardMetric,
  period: LeaderboardPeriod = "all"
): RankedStudent[] {
  const eligible =
    metric === "accuracy"
      ? students.filter((s) => s.graded >= MIN_GRADED_FOR_ACCURACY && s.accuracy !== null)
      : metric === "streak"
        ? students.filter((s) => (period === "week" ? s.checkInDays : s.longestStreak) > 0)
        : students.filter((s) => s.points > 0);

  const sorted = [...eligible].sort((a, b) => {
    const ka = sortKey(a, metric, period);
    const kb = sortKey(b, metric, period);
    for (let i = 0; i < ka.length; i++) {
      if (kb[i] !== ka[i]) return kb[i] - ka[i];
    }
    return a.name.localeCompare(b.name);
  });

  let previousKey: number[] | null = null;
  let previousRank = 0;
  return sorted.map((s, i) => {
    const key = sortKey(s, metric, period);
    const rank = previousKey && sameKey(key, previousKey) ? previousRank : i + 1;
    previousKey = key;
    previousRank = rank;
    return { ...s, rank };
  });
}

// Convenience for callers that just want a student's overall standing on
// marks, such as the dashboard's stats row.
export async function getRankedStudents(): Promise<RankedStudent[]> {
  return rankStudents(await getStudentStats(), "points");
}
