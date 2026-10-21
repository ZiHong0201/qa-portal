"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuspended, suspendedError } from "@/lib/suspension";
import { getUiLang } from "@/lib/i18n.server";
import { homeText } from "@/lib/text/home";
import { dayKey, previousDayKey, marksForStreak } from "@/lib/check-in";

export type CheckInResult = {
  error?: string;
  claimed?: { streak: number; marks: number };
};

export async function claimDailyCheckIn(): Promise<CheckInResult> {
  const [session, lang] = await Promise.all([auth(), getUiLang()]);
  const t = homeText[lang];
  if (!session) return { error: t.checkInLoggedOut };
  if (session.user.role !== "STUDENT") {
    return { error: t.checkInStudentsOnly };
  }
  const studentId = session.user.id;
  if (await isSuspended(studentId)) return { error: suspendedError(lang) };

  const today = dayKey();
  const yesterday = previousDayKey(today);

  const [alreadyToday, yesterdayRow] = await Promise.all([
    prisma.checkIn.findUnique({
      where: { studentId_day: { studentId, day: today } },
      select: { id: true },
    }),
    prisma.checkIn.findUnique({
      where: { studentId_day: { studentId, day: yesterday } },
      select: { streak: true },
    }),
  ]);
  if (alreadyToday) return { error: t.alreadyCheckedIn };

  const streak = (yesterdayRow?.streak ?? 0) + 1;
  const marks = marksForStreak(streak);

  try {
    await prisma.checkIn.create({
      data: { studentId, day: today, streak, pointsAwarded: marks },
    });
  } catch {
    // The unique constraint is the real guard - a double-click or two tabs can
    // both pass the check above before either insert lands.
    return { error: t.alreadyCheckedIn };
  }

  revalidatePath("/dashboard");
  return { claimed: { streak, marks } };
}
