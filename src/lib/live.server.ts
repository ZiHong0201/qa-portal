import { createHash, randomBytes } from "crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ANSWER_GRACE_MS,
  LIVE_RETENTION_DAYS,
  MAX_PLAYERS,
  NAME_MAX_LENGTH,
  cleanName,
  nameKeyOf,
  phaseOf,
  pointsFor,
  type LiveState,
} from "@/lib/live";

/**
 * The live quiz's server side: building the shared state every phone polls,
 * and the two things a player can do - join, and answer.
 *
 * Players have no account. A phone is identified by a random token handed
 * out at join and kept in the browser; only its hash is stored, so the table
 * holding it cannot be used to answer as someone else.
 */

/** A unique index refused the write - P2002, as the portal checks elsewhere. */
function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** The most recent game with this code. Codes are reused once a game is old. */
async function quizByCode(code: string) {
  return prisma.liveQuiz.findFirst({ where: { code }, orderBy: { createdAt: "desc" } });
}

export async function getLiveState(code: string): Promise<LiveState | null> {
  const quiz = await quizByCode(code);
  if (!quiz) return null;

  const now = Date.now();
  const phase = phaseOf(quiz, now);
  const ids = JSON.parse(quiz.questionIds) as string[];
  const index = quiz.currentIndex;
  const questionId = index >= 0 ? (ids[index] ?? null) : null;

  const asking = phase === "QUESTION" || phase === "REVEAL";
  const listing = phase === "LOBBY" || phase === "REVEAL" || phase === "FINISHED";
  // Answers from a player the host has since removed do not count towards
  // anything the room sees.
  const thisQuestion = { quizId: quiz.id, questionIndex: index, participant: { removed: false } };

  // Everything in one parallel round. The database is a network hop away, so
  // the number of sequential trips is what decides how long a poll takes.
  const [people, playerCount, question, answered, split, gains] = await Promise.all([
    listing
      ? prisma.liveParticipant.findMany({
          where: { quizId: quiz.id, removed: false },
          orderBy: phase === "LOBBY" ? { joinedAt: "asc" } : [{ score: "desc" }, { joinedAt: "asc" }],
          select: { id: true, name: true, score: true },
        })
      : null,
    listing ? null : prisma.liveParticipant.count({ where: { quizId: quiz.id, removed: false } }),
    asking && questionId
      ? prisma.question.findUnique({
          where: { id: questionId },
          select: {
            body: true,
            diagramUrl: true,
            choices: { orderBy: { order: "asc" }, select: { id: true, text: true, isCorrect: true } },
          },
        })
      : null,
    asking ? prisma.liveAnswer.count({ where: thisQuestion }) : 0,
    phase === "REVEAL"
      ? prisma.liveAnswer.groupBy({ by: ["choiceId"], where: thisQuestion, _count: { _all: true } })
      : null,
    // What each player scored on this question, so a phone can say "+856"
    // without having to remember the previous total - which it would not, if
    // it had been refreshed or joined late.
    phase === "REVEAL"
      ? prisma.liveAnswer.findMany({ where: thisQuestion, select: { participantId: true, points: true } })
      : null,
  ]);

  const gainedBy = new Map((gains ?? []).map((a) => [a.participantId, a.points]));

  return {
    quizId: quiz.id,
    code: quiz.code,
    title: quiz.title,
    phase,
    index,
    total: ids.length,
    secondsPerQuestion: quiz.secondsPerQuestion,
    serverNow: now,
    startsAt: quiz.startsAt?.getTime() ?? null,
    endsAt: quiz.endsAt?.getTime() ?? null,
    players: people ? people.length : (playerCount ?? 0),
    lobby: phase === "LOBBY" ? people : null,
    question: question
      ? {
          body: question.body,
          diagramUrl: question.diagramUrl,
          // isCorrect never leaves the server before time is up.
          choices: question.choices.map((c) => ({ id: c.id, text: c.text })),
        }
      : null,
    answered,
    reveal:
      phase === "REVEAL" && question
        ? {
            correctChoiceId: question.choices.find((c) => c.isCorrect)?.id ?? null,
            counts: Object.fromEntries((split ?? []).map((r) => [r.choiceId, r._count._all])),
          }
        : null,
    standings:
      phase === "REVEAL"
        ? (people ?? []).map((p) => ({ ...p, gained: gainedBy.get(p.id) ?? 0 }))
        : phase === "FINISHED"
          ? people
          : null,
  };
}

export type JoinResult =
  | { ok: true; quizId: string; participantId: string; token: string; name: string }
  | { ok: false; status: number; error: string };

export async function joinQuiz(code: string, rawName: unknown): Promise<JoinResult> {
  const name = typeof rawName === "string" ? cleanName(rawName) : "";
  if (!name) return { ok: false, status: 400, error: "Type a name to join." };
  if (name.length > NAME_MAX_LENGTH) {
    return { ok: false, status: 400, error: `Keep your name to ${NAME_MAX_LENGTH} characters.` };
  }

  const quiz = await quizByCode(code);
  if (!quiz) return { ok: false, status: 404, error: "There is no quiz with that code." };
  // Joining late is allowed - the player simply starts from the next question
  // - because in a hall of a hundred someone always arrives after the start.
  if (quiz.status === "FINISHED") return { ok: false, status: 410, error: "This quiz has finished." };

  const nameKey = nameKeyOf(name);
  const [count, taken] = await Promise.all([
    prisma.liveParticipant.count({ where: { quizId: quiz.id, removed: false } }),
    prisma.liveParticipant.findUnique({
      where: { quizId_nameKey: { quizId: quiz.id, nameKey } },
      select: { removed: true },
    }),
  ]);
  if (taken) {
    // Same answer for a removed name as a taken one: telling someone the host
    // removed that exact name only invites them to try a variation of it.
    return { ok: false, status: 409, error: "Someone already has that name. Try another." };
  }
  if (count >= MAX_PLAYERS) return { ok: false, status: 409, error: "This quiz is full." };

  const token = randomBytes(24).toString("base64url");
  try {
    const p = await prisma.liveParticipant.create({
      data: { quizId: quiz.id, name, nameKey, tokenHash: hashToken(token) },
      select: { id: true },
    });
    return { ok: true, quizId: quiz.id, participantId: p.id, token, name };
  } catch (e) {
    // Two people typing the same name in the same second: the unique index
    // decides, and the loser is told the same thing as above.
    if (isUniqueViolation(e)) {
      return { ok: false, status: 409, error: "Someone already has that name. Try another." };
    }
    throw e;
  }
}

export type AnswerResult = { ok: true } | { ok: false; status: number; error: string };

export async function recordAnswer(
  code: string,
  body: { token?: unknown; index?: unknown; choiceId?: unknown }
): Promise<AnswerResult> {
  // Taken first, before any database work, so the speed score reflects when
  // the answer arrived rather than how long the lookups below took.
  const receivedAt = Date.now();

  const { token, index, choiceId } = body;
  if (typeof token !== "string" || typeof index !== "number" || typeof choiceId !== "string") {
    return { ok: false, status: 400, error: "Bad request." };
  }

  const [quiz, player] = await Promise.all([
    quizByCode(code),
    prisma.liveParticipant.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, quizId: true, removed: true },
    }),
  ]);
  if (!quiz || !player || player.quizId !== quiz.id) {
    return { ok: false, status: 403, error: "You are not in this quiz." };
  }
  if (player.removed) return { ok: false, status: 403, error: "The host removed you from this quiz." };

  // The question being answered has to be the one open now. A phone that has
  // fallen behind could otherwise answer the previous question late, or the
  // next one early.
  if (quiz.status !== "RUNNING" || quiz.currentIndex !== index || !quiz.startsAt || !quiz.endsAt) {
    return { ok: false, status: 409, error: "That question is closed." };
  }
  const opens = quiz.startsAt.getTime();
  const closes = quiz.endsAt.getTime();
  if (receivedAt < opens || receivedAt > closes + ANSWER_GRACE_MS) {
    return { ok: false, status: 409, error: "That question is closed." };
  }

  const ids = JSON.parse(quiz.questionIds) as string[];
  const choice = await prisma.choice.findFirst({
    where: { id: choiceId, questionId: ids[index] },
    select: { isCorrect: true },
  });
  if (!choice) return { ok: false, status: 400, error: "That is not one of the options." };

  const points = pointsFor(choice.isCorrect, receivedAt - opens, closes - opens);

  try {
    await prisma.$transaction([
      prisma.liveAnswer.create({
        data: {
          quizId: quiz.id,
          participantId: player.id,
          questionIndex: index,
          choiceId,
          correct: choice.isCorrect,
          points,
        },
      }),
      prisma.liveParticipant.update({
        where: { id: player.id },
        data: { score: { increment: points } },
      }),
    ]);
  } catch (e) {
    // A double tap, or a retry after a slow response. The first answer stands
    // and the score was only added once, so this is not an error to the player.
    if (isUniqueViolation(e)) return { ok: true };
    throw e;
  }

  return { ok: true };
}

/**
 * Deletes games older than LIVE_RETENTION_DAYS, with their players and
 * answers (both cascade).
 *
 * Counted from creation, not from finishing, so a game a host never closed -
 * the laptop shut mid-quiz - is cleared on the same schedule instead of being
 * kept forever because it never reached FINISHED.
 */
export async function deleteOldLiveQuizzes(): Promise<number> {
  const cutoff = new Date(Date.now() - LIVE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const { count } = await prisma.liveQuiz.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return count;
}
