import { prisma } from "@/lib/prisma";

/**
 * How long integrity signals are kept before being wiped.
 *
 * This is about privacy, not disk. The signals are four integer columns on
 * rows that have to exist anyway, and across every submission in the portal
 * they come to a few kilobytes - clearing them frees nothing worth measuring.
 *
 * What they are is a per-question behavioural record of a child: when they
 * looked away, for how long, what they tried to paste. That is worth keeping
 * for long enough to have a conversation about a specific set, and no longer.
 * A month covers the former and ends the latter.
 */
export const INTEGRITY_RETENTION_DAYS = 30;

/**
 * Wipes the signals while leaving the answer, the marks and the timestamp
 * completely intact - a cleared submission is still a full record of what the
 * student answered and what they scored.
 *
 * secondsTaken goes back to null rather than zero so a cleared answer is
 * distinguishable from one genuinely submitted in no time; the counters have
 * no null state and go to zero.
 */
export async function clearIntegritySignals(
  olderThanDays: number | null = INTEGRITY_RETENTION_DAYS
): Promise<number> {
  const where =
    olderThanDays === null
      ? {}
      : { createdAt: { lt: new Date(Date.now() - olderThanDays * 86_400_000) } };

  const { count } = await prisma.submission.updateMany({
    where: {
      ...where,
      // Only touch rows that still carry something, so the count reported back
      // is the number actually wiped rather than every submission ever made.
      OR: [
        { secondsTaken: { not: null } },
        { awayCount: { gt: 0 } },
        { awaySeconds: { gt: 0 } },
        { pasteAttempts: { gt: 0 } },
      ],
    },
    data: { secondsTaken: null, awayCount: 0, awaySeconds: 0, pasteAttempts: 0 },
  });

  return count;
}

/** How many submissions still carry signals, and how old the oldest is. */
export async function integrityRetentionStatus() {
  const [carrying, oldest] = await Promise.all([
    prisma.submission.count({ where: { secondsTaken: { not: null } } }),
    prisma.submission.findFirst({
      where: { secondsTaken: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  return { carrying, oldest: oldest?.createdAt ?? null };
}
