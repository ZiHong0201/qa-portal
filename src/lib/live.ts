// Live quiz rules and shared types. Kept free of Prisma so the player's phone
// and the host's screen import exactly the definitions the server enforces -
// the countdown a player sees and the deadline the server checks come from
// the same constants.

/**
 * Seconds between the host pressing Next and the question opening.
 *
 * Phones learn about a new question by polling, so some see it a couple of
 * seconds after others. Answers are scored on speed, which would make that
 * lag a penalty for having a slow phone. The lead-in is longer than the worst
 * case (one poll interval plus one second of CDN caching) so every phone is
 * showing "get ready" before anyone's clock starts.
 */
export const LEAD_IN_MS = 4_000;

/**
 * How late an answer may arrive and still count. A tap at 0.2 seconds left
 * still has to cross the network; without some slack the last-second answer
 * would be refused for reasons the player cannot see.
 */
export const ANSWER_GRACE_MS = 1_500;

/** How often a player's phone asks for the game state. */
export const PLAYER_POLL_MS = 2_000;
/** The host screen polls faster: it is one device, and it is on a projector. */
export const HOST_POLL_MS = 1_000;

export const NAME_MAX_LENGTH = 20;

/**
 * Days a finished game is kept before it is deleted, players and all. The
 * players are members of the public who typed a name to join a game in a
 * hall; there is no reason to hold that for longer than it takes to look back
 * at the results.
 */
export const LIVE_RETENTION_DAYS = 30;
export const MAX_PLAYERS = 200;

export const SECONDS_CHOICES = [10, 20, 30, 45, 60, 90] as const;

/**
 * Points for one answer: 1,000 for an instant correct answer, falling to 500
 * at the buzzer, nothing for a wrong one.
 *
 * Speed counts, because that is what makes a hall full of people lean in -
 * but only up to half the marks, so a slow correct answer still beats a fast
 * wrong one by a distance.
 */
export function pointsFor(correct: boolean, elapsedMs: number, limitMs: number): number {
  if (!correct) return 0;
  const fraction = Math.min(Math.max(elapsedMs / limitMs, 0), 1);
  return Math.round(1000 - 500 * fraction);
}

/**
 * Where a game is right now.
 *
 *   LOBBY     players joining, nothing asked yet
 *   PRE       next question chosen, clock not started - "get ready"
 *   QUESTION  answers being taken
 *   REVEAL    time is up; correct answer and standings on show
 *   FINISHED  final results
 *
 * Only LOBBY / RUNNING / FINISHED are stored. PRE, QUESTION and REVEAL are
 * worked out from the clock, so the game moves on when time runs out whether
 * or not anyone presses anything - a host whose laptop goes to sleep cannot
 * leave a hall staring at a question that never closes.
 */
export type LivePhase = "LOBBY" | "PRE" | "QUESTION" | "REVEAL" | "FINISHED";

export function phaseOf(
  quiz: { status: string; startsAt: Date | null; endsAt: Date | null },
  now: number
): LivePhase {
  if (quiz.status === "LOBBY") return "LOBBY";
  if (quiz.status === "FINISHED") return "FINISHED";
  if (!quiz.startsAt || !quiz.endsAt) return "LOBBY";
  if (now < quiz.startsAt.getTime()) return "PRE";
  // Still QUESTION through the grace period. The phones lock their buttons at
  // endsAt by their own clock; the server keeps taking late taps a moment
  // longer, and only then reveals - so the counts and standings the room sees
  // already include the answer that arrived at the buzzer.
  if (now < quiz.endsAt.getTime() + ANSWER_GRACE_MS) return "QUESTION";
  return "REVEAL";
}

/** A player's name as typed, tidied: trimmed, inner whitespace collapsed. */
export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/** What the uniqueness check compares, so "Ali" and "ALI " are the same name. */
export function nameKeyOf(name: string): string {
  return cleanName(name).toLocaleLowerCase();
}

export type LiveChoice = { id: string; text: string };

export type LiveStanding = {
  id: string;
  name: string;
  score: number;
  /** Points from the question just revealed; present during REVEAL only. */
  gained?: number;
};

/**
 * Everything a phone or the host screen needs, from one request.
 *
 * The same payload goes to every player, which is what lets the CDN answer
 * most of the polling for a hundred phones without reaching the database: a
 * player's own result is worked out on their phone from the shared reveal
 * (the correct choice, plus the full standings).
 */
export type LiveState = {
  quizId: string;
  code: string;
  title: string;
  phase: LivePhase;
  /** 0-based; -1 in the lobby. */
  index: number;
  total: number;
  secondsPerQuestion: number;
  /** Server clock when this was built, so phones can correct their own. */
  serverNow: number;
  startsAt: number | null;
  endsAt: number | null;
  players: number;
  /** Who is in, while in the lobby. Afterwards the standings say it. */
  lobby: LiveStanding[] | null;
  /** Hidden during PRE, so the get-ready screen cannot be used to read ahead. */
  question: {
    body: string;
    diagramUrl: string | null;
    choices: LiveChoice[];
  } | null;
  answered: number;
  /** Only once time is up: what was right, and how the room split. */
  reveal: { correctChoiceId: string | null; counts: Record<string, number> } | null;
  /** Ranked, during REVEAL and FINISHED. */
  standings: LiveStanding[] | null;
};

/** Kahoot-ish colours, so "the red one" means the same on every phone and the projector. */
export const CHOICE_STYLES = [
  { letter: "A", bg: "bg-rose-500", hover: "hover:bg-rose-600", soft: "bg-rose-100", text: "text-rose-700" },
  { letter: "B", bg: "bg-sky-500", hover: "hover:bg-sky-600", soft: "bg-sky-100", text: "text-sky-700" },
  { letter: "C", bg: "bg-amber-500", hover: "hover:bg-amber-600", soft: "bg-amber-100", text: "text-amber-700" },
  { letter: "D", bg: "bg-emerald-500", hover: "hover:bg-emerald-600", soft: "bg-emerald-100", text: "text-emerald-700" },
  { letter: "E", bg: "bg-violet-500", hover: "hover:bg-violet-600", soft: "bg-violet-100", text: "text-violet-700" },
  { letter: "F", bg: "bg-orange-500", hover: "hover:bg-orange-600", soft: "bg-orange-100", text: "text-orange-700" },
  { letter: "G", bg: "bg-teal-500", hover: "hover:bg-teal-600", soft: "bg-teal-100", text: "text-teal-700" },
  { letter: "H", bg: "bg-fuchsia-500", hover: "hover:bg-fuchsia-600", soft: "bg-fuchsia-100", text: "text-fuchsia-700" },
] as const;
