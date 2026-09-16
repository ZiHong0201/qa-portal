"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { dayKey, previousDayKey, marksForStreak } from "@/lib/check-in";

export type CheckInResult = {
  error?: string;
  claimed?: { streak: number; marks: number };
};

export async function claimDailyCheckIn(): Promise<CheckInResult> {
  const session = await auth();
  if (!session) return { error: "You need to be logged in to check in." };
  if (session.user.role !== "STUDENT") {
    return { error: "Check-ins are for students only." };
  }
  const studentId = session.user.id;

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
  if (alreadyToday) return { error: "You've already checked in today. Come back tomorrow!" };

  const streak = (yesterdayRow?.streak ?? 0) + 1;
  const marks = marksForStreak(streak);

  try {
    await prisma.checkIn.create({
      data: { studentId, day: today, streak, pointsAwarded: marks },
    });
  } catch {
    // The unique constraint is the real guard - a double-click or two tabs can
    // both pass the check above before either insert lands.
    return { error: "You've already checked in today. Come back tomorrow!" };
  }

  revalidatePath("/dashboard");
  return { claimed: { streak, marks } };
}
