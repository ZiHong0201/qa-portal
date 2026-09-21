// Pure virtual-cat logic: stat decay, moods, shop rules. No Prisma, so the
// game screen can import the maths without pulling the database client into
// the browser bundle. Queries live in pet.server.ts.

export const MAX_STAT = 100;

// Points per hour each stat falls by. Hunger empties from full in a little
// under three days, happiness in four - slow enough that a student revising
// all weekend does not come back to a disaster, fast enough that checking in
// during the week is worth doing.
export const HUNGER_DECAY_PER_HOUR = 1.5;
export const HAPPINESS_DECAY_PER_HOUR = 1;

// Deliberately absent: any notion of the cat dying, running away, or being
// taken off them. The worst state is a sad cat that perks straight back up.

export const PET_NAME_MAX_LENGTH = 20;

export type PetCoat = "grey" | "ginger" | "black" | "cream";

export const COATS: { key: PetCoat; name: string; fur: string; ear: string; stroke: string }[] = [
  { key: "grey", name: "Grey", fur: "#8f8983", ear: "#f3b6c0", stroke: "#4a4540" },
  { key: "ginger", name: "Ginger", fur: "#e08a3c", ear: "#f7c9b0", stroke: "#8a4a17" },
  { key: "black", name: "Black", fur: "#4a4a52", ear: "#e0a2ad", stroke: "#23232a" },
  { key: "cream", name: "Cream", fur: "#e8d5b5", ear: "#f3b6c0", stroke: "#a08a63" },
];

export function coatOf(key: string) {
  return COATS.find((c) => c.key === key) ?? COATS[0];
}

export type StoredStats = { hunger: number; happiness: number; statsAt: Date };
export type Stats = { hunger: number; happiness: number };

function clamp(value: number) {
  return Math.max(0, Math.min(MAX_STAT, value));
}

/**
 * What the stats actually are right now.
 *
 * The database holds a reading plus the moment it was taken; the decay since
 * then is arithmetic. That is why there is no scheduled job ticking every pet
 * in the portal - a cat nobody looks at costs nothing.
 */
export function currentStats(pet: StoredStats, now: Date = new Date()): Stats {
  const hours = Math.max(0, (now.getTime() - pet.statsAt.getTime()) / 3_600_000);
  return {
    hunger: Math.round(clamp(pet.hunger - HUNGER_DECAY_PER_HOUR * hours)),
    happiness: Math.round(clamp(pet.happiness - HAPPINESS_DECAY_PER_HOUR * hours)),
  };
}

/** Applies an item's effect to the stats as they stand right now. */
export function applyEffect(stats: Stats, effect: Partial<Stats>): Stats {
  return {
    hunger: Math.round(clamp(stats.hunger + (effect.hunger ?? 0))),
    happiness: Math.round(clamp(stats.happiness + (effect.happiness ?? 0))),
  };
}

export type Mood = {
  key: "happy" | "content" | "hungry" | "sad";
  label: string;
  line: string;
};

/**
 * One mood from both stats, worst-first so the cat asks for what it most
 * needs rather than averaging into a bland middle.
 */
export function moodOf({ hunger, happiness }: Stats, name: string): Mood {
  if (hunger < 30) {
    return { key: "hungry", label: "Hungry", line: `${name} keeps looking at the food bowl.` };
  }
  if (happiness < 30) {
    return { key: "sad", label: "Lonely", line: `${name} would love a treat and some attention.` };
  }
  if (hunger > 70 && happiness > 70) {
    return { key: "happy", label: "Delighted", line: `${name} is purring away happily.` };
  }
  return { key: "content", label: "Content", line: `${name} is dozing comfortably.` };
}

/** Bar colour, so a low stat is obvious without reading the number. */
export function statColor(value: number) {
  if (value >= 60) return "bg-emerald-500";
  if (value >= 30) return "bg-amber-500";
  return "bg-rose-500";
}

/** Roughly how long until a stat runs out, for the "needs feeding by" hint. */
export function hoursUntilEmpty(value: number, perHour: number) {
  return perHour <= 0 ? Infinity : value / perHour;
}

export function describeTimeLeft(hours: number): string {
  if (!Number.isFinite(hours)) return "";
  if (hours < 1) return "less than an hour";
  if (hours < 24) return `about ${Math.round(hours)} hour${Math.round(hours) === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `about ${days} day${days === 1 ? "" : "s"}`;
}
