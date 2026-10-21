import { prisma } from "@/lib/prisma";
import type { UiLang } from "@/lib/i18n";
import { shellText } from "@/lib/text/shell";

/**
 * What a refused action says, so it reads the same wherever it is hit. The
 * words live in the shell text, which client components can import too.
 */
export const SUSPENDED_ERROR = shellText.en.suspended;

export function suspendedError(lang: UiLang): string {
  return shellText[lang].suspended;
}

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
