"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isQuestionLanguage } from "@/lib/bilingual";

/**
 * Remembers which language a student reads bilingual sets in. The switch
 * itself is instant on the page; this only keeps the choice for next time, so
 * there is nothing to revalidate. "both" is stored as null - the default.
 *
 * Not refused for a suspended student: it changes nothing but a display
 * preference, and they cannot reach a set page anyway.
 */
export async function setQuestionLanguage(language: string): Promise<void> {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") return;
  if (!isQuestionLanguage(language)) return;
  await prisma.user.update({
    where: { id: session.user.id },
    data: { questionLanguage: language === "both" ? null : language },
  });
}
