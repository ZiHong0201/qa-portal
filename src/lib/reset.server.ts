import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { RESET_AT } from "@/lib/reset";

/**
 * Wipes every student's progress and spending back to zero.
 *
 * What goes: submissions, check-ins, admin adjustments, catalogue redemptions
 * and cat purchases. Those five move together by necessity rather than choice
 * - the points balance is derived from all of them, so clearing what a student
 * earned without clearing what they spent would leave them owing points they
 * can never repay.
 *
 * What stays: accounts, enrolments, question sets, questions, catalogue items,
 * shop items - and the cats. A cat is a companion rather than a score, so
 * nobody loses the animal they raised because the term ended. Clothes already
 * bought stay on it; the purchase records that paid for them do not, which
 * makes those items effectively a gift from the old term.
 */

export type ResetCounts = {
  submissions: number;
  checkIns: number;
  adjustments: number;
  redemptions: number;
  petPurchases: number;
};

/** What a reset would destroy right now, without destroying it. */
export async function previewReset(): Promise<ResetCounts> {
  const [submissions, checkIns, adjustments, redemptions, petPurchases] = await Promise.all([
    prisma.submission.count(),
    prisma.checkIn.count(),
    prisma.pointAdjustment.count(),
    prisma.redemption.count(),
    prisma.petPurchase.count(),
  ]);
  return { submissions, checkIns, adjustments, redemptions, petPurchases };
}

/**
 * Writes everything about to be deleted to blob storage as JSON.
 *
 * Deliberately stored outside the database it is protecting: a snapshot living
 * in the same place as the data would be no use if the reason for restoring
 * were that the database itself went wrong.
 */
export async function exportSnapshot(): Promise<string> {
  const [submissions, checkIns, adjustments, redemptions, petPurchases, students] =
    await Promise.all([
      prisma.submission.findMany(),
      prisma.checkIn.findMany(),
      prisma.pointAdjustment.findMany(),
      prisma.redemption.findMany(),
      prisma.petPurchase.findMany(),
      // Names and forms, so a restored snapshot is readable without having to
      // cross-reference ids against a database that has since changed.
      //
      // Emails are deliberately left out. The blob store is public-read - the
      // URL is unguessable but not access-controlled - and a file of children's
      // email addresses does not belong there. Id and name are enough to put
      // the marks back against the right student.
      prisma.user.findMany({
        where: { role: "STUDENT" },
        select: { id: true, name: true, grade: true },
      }),
    ]);

  const snapshot = {
    takenAt: new Date().toISOString(),
    reason: "portal reset",
    students,
    submissions,
    checkIns,
    adjustments,
    redemptions,
    petPurchases,
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const blob = await put(`resets/snapshot-${stamp}.json`, JSON.stringify(snapshot, null, 2), {
    access: "public",
    contentType: "application/json",
  });

  return blob.url;
}

/**
 * Takes the snapshot, then clears everything.
 *
 * The export happens first and a failure aborts the whole thing: losing a term
 * of work because the backup silently did not happen is the one outcome worth
 * refusing outright.
 *
 * `scheduledFor` marks which dated reset this run satisfies. The daily job
 * passes RESET_AT so it can tell it has already run; a manual reset passes
 * null, which is what stops someone pressing the button early and quietly
 * cancelling the scheduled one.
 */
export async function runReset(options: {
  scheduledFor?: Date | null;
  triggeredById?: string | null;
}): Promise<{ counts: ResetCounts; snapshotUrl: string }> {
  const counts = await previewReset();
  const snapshotUrl = await exportSnapshot();

  await prisma.$transaction([
    // Order matters only for readability here; nothing references these rows.
    prisma.submission.deleteMany({}),
    prisma.checkIn.deleteMany({}),
    prisma.pointAdjustment.deleteMany({}),
    prisma.redemption.deleteMany({}),
    prisma.petPurchase.deleteMany({}),
    prisma.portalReset.create({
      data: {
        scheduledFor: options.scheduledFor ?? null,
        triggeredById: options.triggeredById ?? null,
        snapshotUrl,
        submissionsCleared: counts.submissions,
        checkInsCleared: counts.checkIns,
        adjustmentsCleared: counts.adjustments,
        redemptionsCleared: counts.redemptions,
        petPurchasesCleared: counts.petPurchases,
      },
    }),
  ]);

  return { counts, snapshotUrl };
}

/** Whether the scheduled reset has already been carried out. */
export async function scheduledResetDone(): Promise<boolean> {
  const done = await prisma.portalReset.findFirst({ where: { scheduledFor: RESET_AT } });
  return !!done;
}

export async function lastReset() {
  return prisma.portalReset.findFirst({ orderBy: { ranAt: "desc" } });
}
