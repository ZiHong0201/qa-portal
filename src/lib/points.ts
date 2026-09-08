import { prisma } from "@/lib/prisma";

export type StudentBalance = {
  earned: number;
  adjustments: number;
  redeemed: number;
  balance: number;
};

// A student's spendable points balance: marks earned from quizzes, plus any
// manual admin adjustments, minus whatever they've redeemed from the
// catalogue. Computed from the underlying records rather than stored, same
// approach as the nav's marks total already used.
export async function getStudentBalance(studentId: string): Promise<StudentBalance> {
  const [earnedAgg, adjustmentAgg, redeemedAgg] = await Promise.all([
    prisma.submission.aggregate({
      where: { studentId, status: { in: ["CORRECT", "APPROVED"] } },
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
  const adjustments = adjustmentAgg._sum.amount ?? 0;
  const redeemed = redeemedAgg._sum.cost ?? 0;

  return { earned, adjustments, redeemed, balance: earned + adjustments - redeemed };
}
