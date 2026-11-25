import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { FEEDBACK_ENABLED_KEY } from "@/lib/feedback";
import { dayKey } from "@/lib/check-in";
import { lookOf, type PetLook } from "@/lib/study-pet";

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
// The study pet never costs points: it grows from correct answers alone, so
// looking after it never competes with saving up for a real reward.
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
  // The study pet, from a LEFT JOIN - all null when the student has no row.
  petElement?: string | null;
  petName?: string | null;
  petRare?: number | bigint | null;
  petGrowth?: number | bigint | null;
  petStudyDay?: string | null;
  petTodayCount?: number | bigint | null;
  petPrevStudyDay?: string | null;
  petGoalDay?: string | null;
  petStreak?: number | bigint | null;
  suspensionReason?: string | null;
  suspendedAt?: string | null;
  feedbackSetting?: string | null;
};

const n = (v: number | bigint | null | undefined) => Number(v ?? 0);

// `db` lets a caller run this inside its own transaction - the gift exchange
// re-checks the balance after charging, before it commits.
async function balanceRow(
  studentId: string,
  db: Prisma.TransactionClient = prisma
): Promise<BalanceRow> {
  const rows = await db.$queryRaw<BalanceRow[]>`
    SELECT
      (SELECT COALESCE(SUM(pointsAwarded), 0) FROM Submission
        WHERE studentId = ${studentId} AND status IN ('CORRECT', 'APPROVED')) AS earned,
      (SELECT COALESCE(SUM(pointsAwarded), 0) FROM CheckIn
        WHERE studentId = ${studentId}) AS checkInBonus,
      (SELECT COALESCE(SUM(amount), 0) FROM PointAdjustment
        WHERE studentId = ${studentId}) AS adjustments,
      -- A rejected exchange is refunded by simply not counting here.
      (SELECT COALESCE(SUM(cost), 0) FROM Redemption
        WHERE studentId = ${studentId} AND rejectedAt IS NULL) AS redeemed,
      (SELECT suspensionReason FROM User WHERE id = ${studentId}) AS suspensionReason,
      (SELECT suspendedAt FROM User WHERE id = ${studentId}) AS suspendedAt,
      (SELECT value FROM PortalSetting WHERE key = ${FEEDBACK_ENABLED_KEY}) AS feedbackSetting,
      p.element AS petElement,
      p.name AS petName,
      p.rare AS petRare,
      p.growth AS petGrowth,
      p.studyDay AS petStudyDay,
      p.todayCount AS petTodayCount,
      p.prevStudyDay AS petPrevStudyDay,
      p.goalDay AS petGoalDay,
      p.streak AS petStreak
    FROM (SELECT 1) LEFT JOIN StudyPet p ON p.ownerId = ${studentId}
  `;
  return rows[0] ?? { earned: 0, checkInBonus: 0, adjustments: 0, redeemed: 0 };
}

function toBalance(r: BalanceRow): StudentBalance {
  const earned = n(r.earned);
  const checkInBonus = n(r.checkInBonus);
  const adjustments = n(r.adjustments);
  const redeemed = n(r.redeemed);
  return {
    earned,
    checkInBonus,
    adjustments,
    redeemed,
    balance: earned + checkInBonus + adjustments - redeemed,
  };
}

export async function getStudentBalance(
  studentId: string,
  db: Prisma.TransactionClient = prisma
): Promise<StudentBalance> {
  return toBalance(await balanceRow(studentId, db));
}

export type Suspension = { reason: string; since: Date };

/** The drawing for the pet columns of a nav row, or null without an egg. */
function petLookOf(r: BalanceRow): PetLook | null {
  if (!r.petElement) return null;
  return lookOf(
    {
      element: r.petElement,
      name: r.petName ?? null,
      rare: !!n(r.petRare),
      growth: n(r.petGrowth),
      studyDay: r.petStudyDay ?? null,
      todayCount: n(r.petTodayCount),
      prevStudyDay: r.petPrevStudyDay ?? null,
      goalDay: r.petGoalDay ?? null,
      streak: n(r.petStreak),
    },
    dayKey()
  );
}

/**
 * Everything the nav bar needs, in one query. The study pet rides along too,
 * so every decorative pet on the page is drawn without another round trip.
 *
 * Also whether the account is suspended, which the dashboard layout checks
 * before rendering anything. Wrapped in React's cache() so that check and the
 * nav share this one query within a request, rather than every page paying
 * an extra round trip to Tokyo for a flag that is almost always unset. The
 * admin's feedback switch rides along for the same reason: the nav link and
 * the home page banner both depend on it.
 */
export const getStudentNav = cache(
  async (
    studentId: string
  ): Promise<{
    balance: StudentBalance;
    /** How to draw the student's pet; null until they have picked an egg. */
    pet: PetLook | null;
    feedbackEnabled: boolean;
    suspension: Suspension | null;
  }> => {
    const row = await balanceRow(studentId);
    return {
      balance: toBalance(row),
      pet: petLookOf(row),
      // Open unless an admin closed it, as isFeedbackEnabled reads it.
      feedbackEnabled: row.feedbackSetting !== "false",
      suspension: row.suspendedAt
        ? { reason: row.suspensionReason ?? "", since: new Date(row.suspendedAt) }
        : null,
    };
  }
);
