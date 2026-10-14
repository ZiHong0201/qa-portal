import { prisma } from "@/lib/prisma";

/** What a refused action says, so it reads the same wherever it is hit. */
export const SUSPENDED_ERROR =
  "Your account is suspended. Please contact admin if you think this is a mistake.";

/**
 * True when this account is currently suspended.
 *
 * The dashboard shows a suspended student nothing but the notice, but a page
 * already open in another tab keeps its buttons until it is reloaded. Every
 * student action checks this too, so those buttons do nothing - the notice is
 * the courtesy, this is the guard.
 */
export async function isSuspended(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { suspendedAt: true },
  });
  return !!user?.suspendedAt;
}
