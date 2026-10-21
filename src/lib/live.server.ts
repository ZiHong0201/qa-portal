import { createHash, randomBytes, randomUUID } from "crypto";
import type { Row } from "@libsql/client";
import { prisma } from "@/lib/prisma";
import { isUniqueViolation, isoNow, liveDb } from "@/lib/live-db";
import {
  ANSWER_GRACE_MS,
  LIVE_RETENTION_DAYS,
  MAX_PLAYERS,
  NAME_MAX_LENGTH,
  cleanName,
  nameKeyOf,
  phaseOf,
  pointsFor,
  type LiveStanding,
  type LiveState,
} from "@/lib/live";
import type { UiLang } from "@/lib/i18n";
import { liveText } from "@/lib/text/live";

/**
 * The live quiz's server side: building the shared state every phone polls,
 * and the two things a player can do - join, and answer.
 *
 * Raw SQL through liveDb() rather than Prisma, for the reason given there:
 * these three paths carry a hundred phones at once, and Prisma's adapter
 * would run their queries one at a time. Each path is written to need as few
 * round trips as possible, using batches - several statements, one request.
 *
 * Players have no account. A phone is identified by a random token handed
 * out at join and kept in the browser; only its hash is stored, so the table
 * holding it cannot be used to answer as someone else.
 */

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

type QuizRow = {
  id: string;
  code: string;
  title: string;
  questionIds: string[];
  secondsPerQuestion: number;
  status: string;
  currentIndex: number;
  startsAt: Date | null;
  endsAt: Date | null;
};

// The most recent game with this code - codes are reused once a game is old.
const QUIZ_BY_CODE = `SELECT id, code, title, questionIds, secondsPerQuestion, status, currentIndex, startsAt, endsAt
  FROM LiveQuiz WHERE code = ? ORDER BY createdAt DESC LIMIT 1`;

function toQuiz(row: Row | undefined): QuizRow | null {
  if (!row) return null;
  return {
    id: String(row.id),
    code: String(row.code),
    title: String(row.title),
    questionIds: JSON.parse(String(row.questionIds)) as string[],
    secondsPerQuestion: Number(row.secondsPerQuestion),
    status: String(row.status),
    currentIndex: Number(row.currentIndex),
    startsAt: row.startsAt ? new Date(String(row.startsAt)) : null,
    endsAt: row.endsAt ? new Date(String(row.endsAt)) : null,
  };
}

/* ------------------------------- state ------------------------------- */

// One built state per game per server process per STATE_TTL_MS. A hundred
// polls arriving in the same second share a single trip to the database,
// whether or not the CDN in front has caught them first.
const STATE_TTL_MS = 800;
const stateCache = new Map<string, { at: number; value: Promise<LiveState | null> }>();

export function getLiveState(code: string, fresh = false): Promise<LiveState | null> {
  const now = Date.now();
  const hit = stateCache.get(code);
  if (!fresh && hit && now - hit.at < STATE_TTL_MS) return hit.value;

  const value = buildLiveState(code).catch((e) => {
    // A failed build must not be served to everyone for the next 800ms.
    stateCache.delete(code);
    throw e;
  });
  stateCache.set(code, { at: now, value });
  // Keep the map from growing with every code ever polled in this process.
  if (stateCache.size > 200) {
    for (const [k, v] of stateCache) if (now - v.at > 60_000) stateCache.delete(k);
  }
  return value;
}

async function buildLiveState(code: string): Promise<LiveState | null> {
  const db = liveDb();
  const quiz = toQuiz((await db.execute({ sql: QUIZ_BY_CODE, args: [code] })).rows[0]);
  if (!quiz) return null;

  const now = Date.now();
  const phase = phaseOf(quiz, now);
  const index = quiz.currentIndex;
  const questionId = index >= 0 ? (quiz.questionIds[index] ?? null) : null;
  const asking = (phase === "QUESTION" || phase === "REVEAL") && !!questionId;
  const listing = phase === "LOBBY" || phase === "REVEAL" || phase === "FINISHED";

  // Answers from a player the host has since removed do not count towards
  // anything the room sees.
  const answersHere = `FROM LiveAnswer a JOIN LiveParticipant p ON p.id = a.participantId
    WHERE a.quizId = ? AND a.questionIndex = ? AND p.removed = 0`;

  // Everything else in a single request, whatever the phase needs.
  const statements: { key: string; sql: string; args: (string | number)[] }[] = [
    listing
      ? {
          key: "people",
          sql: `SELECT id, name, score FROM LiveParticipant WHERE quizId = ? AND removed = 0
                ORDER BY ${phase === "LOBBY" ? "joinedAt" : "score DESC, joinedAt"}`,
          args: [quiz.id],
        }
      : {
          key: "count",
          sql: `SELECT COUNT(*) AS n FROM LiveParticipant WHERE quizId = ? AND removed = 0`,
          args: [quiz.id],
        },
  ];
  if (asking) {
    statements.push(
      { key: "question", sql: `SELECT body, diagramUrl FROM Question WHERE id = ?`, args: [questionId!] },
      {
        key: "choices",
        sql: `SELECT id, text, isCorrect FROM Choice WHERE questionId = ? ORDER BY "order"`,
        args: [questionId!],
      },
      { key: "answered", sql: `SELECT COUNT(*) AS n ${answersHere}`, args: [quiz.id, index] }
    );
  }
  if (phase === "REVEAL") {
    statements.push(
      {
        key: "split",
        sql: `SELECT a.choiceId AS choiceId, COUNT(*) AS n ${answersHere} GROUP BY a.choiceId`,
        args: [quiz.id, index],
      },
      // What each player scored on this question, so a phone can say "+856"
      // without remembering the previous total - which it would not, if it
      // had been refreshed or joined late.
      {
        key: "gains",
        sql: `SELECT a.participantId AS participantId, a.points AS points ${answersHere}`,
        args: [quiz.id, index],
      }
    );
  }

  const results = await db.batch(
    statements.map(({ sql, args }) => ({ sql, args })),
    "read"
  );
  const got = Object.fromEntries(statements.map((s, i) => [s.key, results[i].rows]));

  const people: LiveStanding[] | null = got.people
    ? got.people.map((r) => ({ id: String(r.id), name: String(r.name), score: Number(r.score) }))
    : null;
  const questionRow = got.question?.[0];
  const choices = (got.choices ?? []).map((r) => ({
    id: String(r.id),
    text: String(r.text),
    isCorrect: Number(r.isCorrect) === 1,
  }));
  const gainedBy = new Map((got.gains ?? []).map((r) => [String(r.participantId), Number(r.points)]));

  return {
    quizId: quiz.id,
    code: quiz.code,
    title: quiz.title,
    phase,
    index,
    total: quiz.questionIds.length,
    secondsPerQuestion: quiz.secondsPerQuestion,
    serverNow: now,
    startsAt: quiz.startsAt?.getTime() ?? null,
    endsAt: quiz.endsAt?.getTime() ?? null,
    players: people ? people.length : Number(got.count?.[0]?.n ?? 0),
    lobby: phase === "LOBBY" ? people : null,
    question: questionRow
      ? {
          body: String(questionRow.body),
          diagramUrl: questionRow.diagramUrl ? String(questionRow.diagramUrl) : null,
          // isCorrect never leaves the server before time is up.
          choices: choices.map(({ id, text }) => ({ id, text })),
        }
      : null,
    answered: Number(got.answered?.[0]?.n ?? 0),
    reveal:
      phase === "REVEAL" && questionRow
        ? {
            correctChoiceId: choices.find((c) => c.isCorrect)?.id ?? null,
            counts: Object.fromEntries((got.split ?? []).map((r) => [String(r.choiceId), Number(r.n)])),
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

/* -------------------------------- join -------------------------------- */

export type JoinResult =
  | { ok: true; quizId: string; participantId: string; token: string; name: string }
  | { ok: false; status: number; error: string };

/** Errors come back in the player's language; English unless told otherwise. */
export async function joinQuiz(code: string, rawName: unknown, lang: UiLang = "en"): Promise<JoinResult> {
  const t = liveText[lang];
  const nameTaken = t.errNameTaken;
  const name = typeof rawName === "string" ? cleanName(rawName) : "";
  if (!name) return { ok: false, status: 400, error: t.errTypeName };
  if (name.length > NAME_MAX_LENGTH) {
    return { ok: false, status: 400, error: t.errNameLength(NAME_MAX_LENGTH) };
  }
  const nameKey = nameKeyOf(name);

  const db = liveDb();
  // The game, how full it is, and whether the name is free - one request.
  const latest = `(SELECT id FROM LiveQuiz WHERE code = ? ORDER BY createdAt DESC LIMIT 1)`;
  const [quizRes, countRes, takenRes] = await db.batch(
    [
      { sql: QUIZ_BY_CODE, args: [code] },
      {
        sql: `SELECT COUNT(*) AS n FROM LiveParticipant WHERE removed = 0 AND quizId = ${latest}`,
        args: [code],
      },
      {
        sql: `SELECT 1 FROM LiveParticipant WHERE nameKey = ? AND quizId = ${latest}`,
        args: [nameKey, code],
      },
    ],
    "read"
  );

  const quiz = toQuiz(quizRes.rows[0]);
  if (!quiz) return { ok: false, status: 404, error: t.errNoQuiz };
  // Joining late is allowed - the player starts from the next question -
  // because in a hall of a hundred someone always arrives after the start.
  if (quiz.status === "FINISHED") return { ok: false, status: 410, error: t.errFinished };
  // A removed name is refused with the same words as a taken one: telling
  // someone the host removed that exact name only invites a variation of it.
  if (takenRes.rows.length > 0) return { ok: false, status: 409, error: nameTaken };
  if (Number(countRes.rows[0]?.n ?? 0) >= MAX_PLAYERS) {
    return { ok: false, status: 409, error: t.errFull };
  }

  const token = randomBytes(24).toString("base64url");
  const participantId = randomUUID();
  try {
    await db.execute({
      sql: `INSERT INTO LiveParticipant (id, quizId, name, nameKey, tokenHash, score, removed, joinedAt)
            VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
      args: [participantId, quiz.id, name, nameKey, hashToken(token), isoNow()],
    });
  } catch (e) {
    // Two people typing the same name in the same second: the unique index
    // decides, and the second is told the same thing as above.
    if (isUniqueViolation(e)) return { ok: false, status: 409, error: nameTaken };
    throw e;
  }
  return { ok: true, quizId: quiz.id, participantId, token, name };
}

/* ------------------------------- answer ------------------------------- */

export type AnswerResult = { ok: true } | { ok: false; status: number; error: string };

/** Errors come back in the player's language; English unless told otherwise. */
export async function recordAnswer(
  code: string,
  body: { token?: unknown; index?: unknown; choiceId?: unknown },
  lang: UiLang = "en"
): Promise<AnswerResult> {
  // Taken first, before any database work, so the speed score reflects when
  // the answer arrived rather than how long the lookups below took.
  const receivedAt = Date.now();
  const t = liveText[lang];
  const closed = { ok: false, status: 409, error: t.errClosed } as const;

  const { token, index, choiceId } = body;
  if (typeof token !== "string" || typeof index !== "number" || typeof choiceId !== "string") {
    return { ok: false, status: 400, error: t.errBadRequest };
  }

  const db = liveDb();
  // The game, the player and the chosen option - one request.
  const [quizRes, playerRes, choiceRes] = await db.batch(
    [
      { sql: QUIZ_BY_CODE, args: [code] },
      { sql: `SELECT id, quizId, removed FROM LiveParticipant WHERE tokenHash = ?`, args: [hashToken(token)] },
      { sql: `SELECT questionId, isCorrect FROM Choice WHERE id = ?`, args: [choiceId] },
    ],
    "read"
  );

  const quiz = toQuiz(quizRes.rows[0]);
  const player = playerRes.rows[0];
  if (!quiz || !player || String(player.quizId) !== quiz.id) {
    return { ok: false, status: 403, error: t.errNotIn };
  }
  if (Number(player.removed) === 1) {
    return { ok: false, status: 403, error: t.errRemoved };
  }

  // The question being answered has to be the one open now. A phone that has
  // fallen behind could otherwise answer the previous question late, or the
  // next one early.
  if (quiz.status !== "RUNNING" || quiz.currentIndex !== index || !quiz.startsAt || !quiz.endsAt) {
    return closed;
  }
  const opens = quiz.startsAt.getTime();
  const closes = quiz.endsAt.getTime();
  if (receivedAt < opens || receivedAt > closes + ANSWER_GRACE_MS) return closed;

  const choice = choiceRes.rows[0];
  if (!choice || String(choice.questionId) !== quiz.questionIds[index]) {
    return { ok: false, status: 400, error: t.errNotOption };
  }
  const correct = Number(choice.isCorrect) === 1;
  const points = pointsFor(correct, receivedAt - opens, closes - opens);
  const playerId = String(player.id);

  // A player may change their answer until the question closes - misclicks
  // on a phone are common, and being stuck with one is the commonest
  // complaint. The answer standing at the close is the one that counts, and
  // it is scored on when *it* was given: otherwise tapping anything at once
  // and switching to the right answer later would keep the fast-answer bonus.
  //
  // Both statements run as one transaction. The score is adjusted by the
  // difference between the new answer's points and the old one's, read in the
  // same transaction, so it always equals the sum of the answers on record.
  // Tapping the answer already chosen changes nothing - a double tap must not
  // cost points by restarting the clock.
  await db.batch(
    [
      {
        sql: `UPDATE LiveParticipant
              SET score = score + ? - COALESCE(
                (SELECT points FROM LiveAnswer WHERE participantId = ? AND questionIndex = ?), 0)
              WHERE id = ? AND NOT EXISTS (
                SELECT 1 FROM LiveAnswer WHERE participantId = ? AND questionIndex = ? AND choiceId = ?)`,
        args: [points, playerId, index, playerId, playerId, index, choiceId],
      },
      {
        sql: `INSERT INTO LiveAnswer (id, quizId, participantId, questionIndex, choiceId, correct, points, answeredAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT (participantId, questionIndex) DO UPDATE SET
                choiceId = excluded.choiceId, correct = excluded.correct,
                points = excluded.points, answeredAt = excluded.answeredAt
              WHERE LiveAnswer.choiceId <> excluded.choiceId`,
        args: [randomUUID(), quiz.id, playerId, index, choiceId, correct ? 1 : 0, points, isoNow()],
      },
    ],
    "write"
  );
  return { ok: true };
}

/* ------------------------------ retention ----------------------------- */

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
