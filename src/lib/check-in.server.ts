import { prisma } from "@/lib/prisma";
import { dayKey, previousDayKey, marksForStreak, type CheckInState } from "@/lib/check-in";

// Reads today's and yesterday's rows only: yesterday is all that's needed to
// know whether the streak carries over, because each row snapshots the streak
// it was part of.
export async function getCheckInState(studentId: string): Promise<CheckInState> {
  const today = dayKey();
  const yesterday = previousDayKey(today);

  const [recent, totalAgg] = await Promise.all([
    prisma.checkIn.findMany({
      where: { studentId, day: { in: [today, yesterday] } },
      select: { day: true, streak: true, pointsAwarded: true },
    }),
    prisma.checkIn.aggregate({ where: { studentId }, _sum: { pointsAwarded: true } }),
  ]);

  const todayRow = recent.find((r) => r.day === today) ?? null;
  const yesterdayRow = recent.find((r) => r.day === yesterday) ?? null;

  return {
    today,
    todayCheckIn: todayRow
      ? { streak: todayRow.streak, pointsAwarded: todayRow.pointsAwarded }
      : null,
    currentStreak: todayRow ? todayRow.streak : (yesterdayRow?.streak ?? 0),
    marksAvailable: todayRow ? 0 : marksForStreak((yesterdayRow?.streak ?? 0) + 1),
    totalCheckInMarks: totalAgg._sum.pointsAwarded ?? 0,
  };
}
