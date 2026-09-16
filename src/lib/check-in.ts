// Pure check-in logic: day maths, reward table, shared types. Kept free of
// Prisma so client components (the check-in card) can import the constants and
// types without dragging the database client into the browser bundle. The
// query lives in check-in.server.ts.

// Students are in Malaysia; Vercel runs in UTC. Pinning the zone means "today"
// flips at local midnight for everyone, instead of at 8am local time.
export const CHECK_IN_TIME_ZONE = "Asia/Kuala_Lumpur";

// en-CA formats as "YYYY-MM-DD", which sorts and compares as a plain string.
const DAY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: CHECK_IN_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function dayKey(date: Date = new Date()): string {
  return DAY_FORMAT.format(date);
}

export function previousDayKey(day: string): string {
  // Parsed as UTC midnight, so subtracting a day can't land back on the same
  // date through a DST shift - and Malaysia has no DST anyway.
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export const CHECK_IN_BASE_MARKS = 5;
export const CHECK_IN_MAX_DAILY_MARKS = 10;
export const CHECK_IN_MILESTONE_EVERY = 7;
export const CHECK_IN_MILESTONE_BONUS = 15;

// Marks for checking in on the Nth consecutive day: 5 on day one, climbing by
// one a day to a 10 cap, with an extra 15 every seventh day so a full week
// kept up is worth noticing.
export function marksForStreak(streak: number): number {
  const daily = Math.min(CHECK_IN_BASE_MARKS + (streak - 1), CHECK_IN_MAX_DAILY_MARKS);
  const milestone = streak % CHECK_IN_MILESTONE_EVERY === 0 ? CHECK_IN_MILESTONE_BONUS : 0;
  return daily + milestone;
}

export type CheckInState = {
  today: string;
  /** The check-in already claimed today, if any. */
  todayCheckIn: { streak: number; pointsAwarded: number } | null;
  /** Consecutive days up to and including today (0 if the streak is broken). */
  currentStreak: number;
  /** What claiming right now would be worth (0 if already claimed today). */
  marksAvailable: number;
  /** Total bonus marks this student has earned from checking in. */
  totalCheckInMarks: number;
};
