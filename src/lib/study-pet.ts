// Pure study-pet rules: elements, stages, the daily goal, moods. No Prisma, so
// client components can import the numbers and types without pulling the
// database client into the browser bundle. Queries live in study-pet.server.ts.

import { previousDayKey } from "@/lib/check-in";

export const ELEMENTS = ["earth", "water", "fire", "electricity", "gravity"] as const;
export type Element = (typeof ELEMENTS)[number];

export function isElement(value: unknown): value is Element {
  return typeof value === "string" && (ELEMENTS as readonly string[]).includes(value);
}

// One growth point per correct answer, but no more than this many a day.
// The cap is what makes steady practice beat one huge cram: a student who
// answers 300 questions on a Sunday grows no faster than one who does 30.
export const DAILY_GROWTH_CAP = 30;

// Correct answers that count as "fed today", and that keep the streak going.
export const DAILY_GOAL = 5;

// Growth needed to reach each stage. At a steady 15 or so correct answers on
// four days a week, a student hatches in their first session, reaches young
// in two to three weeks, adult in about two months and the final form in
// about a semester.
export const STAGES = ["egg", "hatchling", "young", "adult", "final"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_GROWTH: Record<Stage, number> = {
  egg: 0,
  hatchling: 10,
  young: 150,
  adult: 500,
  final: 1200,
};

// Days without a correct answer before the pet falls asleep - and, once the
// student is back, how long an absence earns a "welcome back".
export const ASLEEP_AFTER_DAYS = 3;

export const PET_NAME_MAX_LENGTH = 20;

/** The stage growth alone would reach. Hatching also needs a name. */
export function stageForGrowth(growth: number): Stage {
  let stage: Stage = "egg";
  for (const s of STAGES) if (growth >= STAGE_GROWTH[s]) stage = s;
  return stage;
}

/** The next stage and how far through the current one the pet is, 0 to 1. */
export function stageProgress(growth: number, stage: Stage) {
  const i = STAGES.indexOf(stage);
  const next = STAGES[i + 1] as Stage | undefined;
  if (!next) return { next: null, needed: 0, fraction: 1 };
  const from = STAGE_GROWTH[stage];
  const to = STAGE_GROWTH[next];
  return {
    next,
    needed: Math.max(0, to - growth),
    fraction: Math.min(1, Math.max(0, (growth - from) / (to - from))),
  };
}

/** Whole days from one day key to another. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export type Mood = "happy" | "content" | "waiting" | "asleep" | "back";

/** The stored bookkeeping a mood and a streak are worked out from. */
export type PetDays = {
  studyDay: string | null;
  todayCount: number;
  prevStudyDay: string | null;
  goalDay: string | null;
  streak: number;
};

/** Correct answers so far today - zero once the day has rolled over. */
export function countToday(pet: PetDays, today: string): number {
  return pet.studyDay === today ? pet.todayCount : 0;
}

/**
 * The streak as it stands today. It is still alive if the goal was met today
 * or yesterday (today's answers may not be in yet), and broken otherwise.
 */
export function currentStreak(pet: PetDays, today: string): number {
  if (!pet.goalDay) return 0;
  if (pet.goalDay === today || pet.goalDay === previousDayKey(today)) return pet.streak;
  return 0;
}

/**
 * How the pet feels right now. Never sad, hungry or ill: the worst it gets is
 * asleep, and the moment the student answers something it is pleased to see
 * them. A student should want to come back, not feel guilty for being away.
 */
export function moodOf(pet: PetDays, today: string): Mood {
  if (pet.studyDay === today) {
    if (pet.todayCount >= DAILY_GOAL) return "happy";
    if (pet.prevStudyDay && daysBetween(pet.prevStudyDay, today) >= ASLEEP_AFTER_DAYS) {
      return "back";
    }
    return "content";
  }
  if (!pet.studyDay || daysBetween(pet.studyDay, today) >= ASLEEP_AFTER_DAYS) return "asleep";
  return "waiting";
}

/**
 * Everything the drawing needs. Small enough to ride along with the nav's
 * query and be handed to every decorative pet on the page.
 */
export type PetLook = {
  element: Element;
  stage: Stage;
  rare: boolean;
  mood: Mood;
};

/**
 * The pet shown to anyone without one of their own - staff, and students who
 * have not picked an egg yet. A young Earth pet, so the decorative pets
 * around the portal still read as "the pet" before a student has chosen.
 */
export const DEFAULT_LOOK: PetLook = {
  element: "earth",
  stage: "young",
  rare: false,
  mood: "content",
};

/** The raw row fields the look is built from. */
export type PetRow = PetDays & {
  element: string | null;
  name: string | null;
  rare: boolean;
  growth: number;
};

/**
 * The drawing for a stored pet. An egg until it has both the growth to hatch
 * and a name - the naming is the hatching moment, on the pet page.
 */
export function lookOf(pet: PetRow, today: string): PetLook | null {
  if (!isElement(pet.element)) return null;
  const grown = stageForGrowth(pet.growth);
  const stage = pet.name ? (grown === "egg" ? "hatchling" : grown) : "egg";
  return {
    element: pet.element,
    stage,
    // Hidden until hatching, so the egg gives nothing away.
    rare: stage !== "egg" && pet.rare,
    mood: moodOf(pet, today),
  };
}
