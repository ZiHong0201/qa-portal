import { prisma } from "@/lib/prisma";

export type StudentBalance = {
  earned: number;
  checkInBonus: number;
  adjustments: number;
  redeemed: number;
  /** Spent on the virtual cat - food, snacks and clothes. */
  petSpend: number;
  balance: number;
};

// A student's spendable points balance: marks earned from quizzes, plus daily
// check-in bonuses and any manual admin adjustments, minus whatever they've
// redeemed from the catalogue and spent on their virtual cat. Computed from
// the underlying records rather than stored, same approach as the nav's marks
// total already used.
//
// The cat draws on the same balance as the catalogue by design, so a snack
// really does compete with saving up for a real reward.
//
// Note the scoreboard deliberately does NOT count check-in bonuses - it ranks
// marks earned by answering questions, so nobody climbs it by logging in.
/**
 * One row of totals, computed in a single round trip.
 *
 * This used to be five separate aggregates run in parallel. Parallel is not
 * the same as free here: the libSQL client sends every query as its own HTTP
 * request to Turso, and the database is a region away from the functions, so
 * five aggregates meant five network round trips on a page that only needed
 * one number. The nav calls this on every single page, so it was the largest
 * fixed cost in the app.
 */
type BalanceRow = {
  earned: number | bigint;
  checkInBonus: number | bigint;
  adjustments: number | bigint;
  redeemed: number | bigint;
  petSpend: number | bigint;
  petEnabled?: number | bigint | null;
};

const n = (v: number | bigint | null | undefined) => Number(v ?? 0);

async function balanceRow(studentId: string): Promise<BalanceRow> {
  const rows = await prisma.$queryRaw<BalanceRow[]>`
    SELECT
      (SELECT COALESCE(SUM(pointsAwarded), 0) FROM Submission
        WHERE studentId = ${studentId} AND status IN ('CORRECT', 'APPROVED')) AS earned,
      (SELECT COALESCE(SUM(pointsAwarded), 0) FROM CheckIn
        WHERE studentId = ${studentId}) AS checkInBonus,
      (SELECT COALESCE(SUM(amount), 0) FROM PointAdjustment
        WHERE studentId = ${studentId}) AS adjustments,
      (SELECT COALESCE(SUM(cost), 0) FROM Redemption
        WHERE studentId = ${studentId}) AS redeemed,
      (SELECT COALESCE(SUM(cost), 0) FROM PetPurchase
        WHERE studentId = ${studentId}) AS petSpend,
      (SELECT petEnabled FROM User WHERE id = ${studentId}) AS petEnabled
  `;
  return rows[0] ?? { earned: 0, checkInBonus: 0, adjustments: 0, redeemed: 0, petSpend: 0 };
}

function toBalance(r: BalanceRow): StudentBalance {
  const earned = n(r.earned);
  const checkInBonus = n(r.checkInBonus);
  const adjustments = n(r.adjustments);
  const redeemed = n(r.redeemed);
  const petSpend = n(r.petSpend);
  return {
    earned,
    checkInBonus,
    adjustments,
    redeemed,
    petSpend,
    balance: earned + checkInBonus + adjustments - redeemed - petSpend,
  };
}

export async function getStudentBalance(studentId: string): Promise<StudentBalance> {
  return toBalance(await balanceRow(studentId));
}

/**
 * Everything the nav bar needs, in one query. Previously the balance and the
 * pet flag were two separate trips on every page.
 */
export async function getStudentNav(
  studentId: string
): Promise<{ balance: StudentBalance; petEnabled: boolean }> {
  const row = await balanceRow(studentId);
  return { balance: toBalance(row), petEnabled: !!n(row.petEnabled) };
}
