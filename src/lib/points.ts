import { prisma } from "@/lib/prisma";

export type StudentBalance = {
  earned: number;
  checkInBonus: number;
  adjustments: number;
  redeemed: number;
  balance: number;
};

// A student's spendable points balance: marks earned from quizzes, plus daily
// check-in bonuses and any manual admin adjustments, minus whatever they've
// redeemed from the catalogue. Computed from the underlying records rather
// than stored, same approach as the nav's marks total already used.
//
// Note the scoreboard deliberately does NOT count check-in bonuses - it ranks
// marks earned by answering questions, so nobody climbs it by logging in.
export async function getStudentBalance(studentId: string): Promise<StudentBalance> {
  const [earnedAgg, checkInAgg, adjustmentAgg, redeemedAgg] = await Promise.all([
    prisma.submission.aggregate({
      where: { studentId, status: { in: ["CORRECT", "APPROVED"] } },
      _sum: { pointsAwarded: true },
    }),
    prisma.checkIn.aggregate({
      where: { studentId },
      _sum: { pointsAwarded: true },
    }),
    prisma.pointAdjustment.aggregate({
      where: { studentId },
      _sum: { amount: true },
    }),
    prisma.redemption.aggregate({
      where: { studentId },
      _sum: { cost: true },
    }),
  ]);

  const earned = earnedAgg._sum.pointsAwarded ?? 0;
  const checkInBonus = checkInAgg._sum.pointsAwarded ?? 0;
  const adjustments = adjustmentAgg._sum.amount ?? 0;
  const redeemed = redeemedAgg._sum.cost ?? 0;

  return {
    earned,
    checkInBonus,
    adjustments,
    redeemed,
    balance: earned + checkInBonus + adjustments - redeemed,
  };
}
