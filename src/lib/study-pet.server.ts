import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { dayKey, previousDayKey } from "@/lib/check-in";
import { DAILY_GOAL, DAILY_GROWTH_CAP, type PetRow } from "@/lib/study-pet";

// About one pet in twenty hatches in its element's rare colours.
const RARE_ODDS = 20;

/**
 * Counts one correct answer towards a student's pet.
 *
 * One SQL statement, so it costs a single round trip and two answers landing
 * at once cannot both read the old count. The row is created by the first
 * correct answer if it does not exist yet - before the student has even
 * picked an egg - so nothing they do before visiting the pet page is lost.
 *
 * In SQLite every expression in an UPDATE reads the row as it was before the
 * update, so each CASE below sees the old studyDay and todayCount.
 */
export async function recordCorrectAnswer(studentId: string, now: Date = new Date()) {
  const today = dayKey(now);
  const yesterday = previousDayKey(today);
  // The count this answer brings today to. Used three times below, each with
  // its own bound parameter for today.
  const newCount = `(CASE WHEN "studyDay" = ? THEN "todayCount" + 1 ELSE 1 END)`;

  // The first answer of all: one growth, one answer today. DAILY_GOAL is
  // above one, so it cannot have met the goal yet.
  await prisma.$executeRawUnsafe(
    `INSERT INTO "StudyPet" ("id", "ownerId", "rare", "growth", "studyDay", "todayCount")
     VALUES (?, ?, (abs(random()) % ${RARE_ODDS} = 0), 1, ?, 1)
     ON CONFLICT ("ownerId") DO UPDATE SET
       "growth" = "growth" + CASE WHEN "studyDay" = ? AND "todayCount" >= ${DAILY_GROWTH_CAP} THEN 0 ELSE 1 END,
       "prevStudyDay" = CASE WHEN "studyDay" = ? THEN "prevStudyDay" ELSE "studyDay" END,
       "streak" = CASE WHEN ${newCount} = ${DAILY_GOAL}
                       THEN CASE WHEN "goalDay" = ? THEN "streak" + 1 ELSE 1 END
                       ELSE "streak" END,
       "goalDay" = CASE WHEN ${newCount} = ${DAILY_GOAL} THEN ? ELSE "goalDay" END,
       "todayCount" = ${newCount},
       "studyDay" = ?`,
    randomUUID(),
    studentId,
    today, // VALUES studyDay
    today, // growth
    today, // prevStudyDay
    today, // streak: newCount
    yesterday, // streak: was yesterday a goal day?
    today, // goalDay: newCount
    today, // goalDay: set to today
    today, // todayCount: newCount
    today // studyDay
  );
}

export const PET_ROW_SELECT = {
  element: true,
  name: true,
  rare: true,
  growth: true,
  studyDay: true,
  todayCount: true,
  prevStudyDay: true,
  goalDay: true,
  streak: true,
} as const;

/** The student's pet row, or null if they have never had one. */
export async function getPetRow(studentId: string): Promise<(PetRow & { hatchedAt: Date | null }) | null> {
  return prisma.studyPet.findUnique({
    where: { ownerId: studentId },
    select: { ...PET_ROW_SELECT, hatchedAt: true },
  });
}

/** A fresh egg's rarity, rolled once when the row is first created. */
export function rollRare(): boolean {
  return Math.floor(Math.random() * RARE_ODDS) === 0;
}
