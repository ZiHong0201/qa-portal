"use server";

import { randomInt } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { LEAD_IN_MS, LIVE_RETENTION_DAYS, SECONDS_CHOICES } from "@/lib/live";
import type { FormState } from "./auth";

/**
 * The host's side of a live quiz.
 *
 * Staff rather than admin: running a game for a class is teaching. Every
 * action that moves the game on names the question it expects to move from,
 * and the update only applies if that is still true. A double-click, or two
 * staff with the host screen open, therefore cannot skip a question - the
 * second press finds the game already moved and does nothing.
 */

/**
 * A six-digit code no game still on record is using. Finished games are kept
 * for LIVE_RETENTION_DAYS and then deleted, so reserving a code for exactly
 * that long means two stored games never share one.
 */
async function generateCode(): Promise<string> {
  const reservedSince = new Date(Date.now() - LIVE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = String(randomInt(100000, 1000000));
    const clash = await prisma.liveQuiz.findFirst({
      where: { code, OR: [{ status: { not: "FINISHED" } }, { createdAt: { gte: reservedSince } }] },
      select: { id: true },
    });
    if (!clash) return code;
  }
  // 900,000 codes and a handful of games a month: reaching here means
  // something else is wrong, and a clear failure beats a shared code.
  throw new Error("Could not find a free quiz code.");
}

const createSchema = z.object({
  questionSetId: z.string().min(1, "Choose a question set."),
  seconds: z.coerce.number().refine((n) => (SECONDS_CHOICES as readonly number[]).includes(n), {
    message: "Choose a time per question.",
  }),
  count: z.coerce.number().int().min(1).max(100),
  shuffle: z.coerce.boolean(),
});

export async function createLiveQuiz(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireStaff();

  const parsed = createSchema.safeParse({
    questionSetId: formData.get("questionSetId"),
    seconds: formData.get("seconds"),
    count: formData.get("count"),
    shuffle: formData.get("shuffle") ?? false,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { questionSetId, seconds, count, shuffle } = parsed.data;

  const set = await prisma.questionSet.findUnique({
    where: { id: questionSetId },
    select: {
      title: true,
      // Multiple choice only. A written answer has to be marked by a teacher,
      // and there is no time for that between questions in a live game.
      questions: {
        where: { isActive: true, type: "MULTIPLE_CHOICE" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      },
    },
  });
  if (!set) return { error: "That question set no longer exists." };
  if (set.questions.length === 0) {
    return { error: "That set has no multiple-choice questions to play." };
  }

  let ids = set.questions.map((q) => q.id);
  if (shuffle) {
    for (let i = ids.length - 1; i > 0; i--) {
      const j = randomInt(0, i + 1);
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
  }
  ids = ids.slice(0, count);

  const quiz = await prisma.liveQuiz.create({
    data: {
      code: await generateCode(),
      title: set.title,
      questionSetId,
      questionIds: JSON.stringify(ids),
      secondsPerQuestion: seconds,
      hostId: session.user.id,
    },
    select: { id: true },
  });

  revalidatePath("/admin/live");
  redirect(`/admin/live/${quiz.id}`);
}

/**
 * Opens the next question - or the first, from the lobby.
 *
 * Refused while a question is still open: Next only means anything once the
 * room has seen the answer. `fromIndex` is the question the host screen was
 * showing when the button was pressed.
 */
export async function nextQuestion(quizId: string, fromIndex: number) {
  await requireStaff();

  const quiz = await prisma.liveQuiz.findUnique({
    where: { id: quizId },
    select: { questionIds: true, secondsPerQuestion: true },
  });
  if (!quiz) return;
  const total = (JSON.parse(quiz.questionIds) as string[]).length;
  if (fromIndex + 1 >= total) return;

  const now = Date.now();
  const startsAt = new Date(now + LEAD_IN_MS);
  const endsAt = new Date(startsAt.getTime() + quiz.secondsPerQuestion * 1000);

  await prisma.liveQuiz.updateMany({
    where: {
      id: quizId,
      currentIndex: fromIndex,
      status: { not: "FINISHED" },
      OR: [{ endsAt: null }, { endsAt: { lte: new Date(now) } }],
    },
    data: { status: "RUNNING", currentIndex: fromIndex + 1, startsAt, endsAt },
  });
}

/** Closes the open question now - everyone has answered, or the host is moving on. */
/**
 * Brings the open question's deadline forward - to now, or `afterMs` from now.
 *
 * The host's "stop the clock" button closes at once. When everyone has
 * answered, the host screen asks for a short delay instead: players can
 * change their answer until the close, and closing the instant the last
 * person tapped would take that chance away from everyone else.
 */
export async function closeQuestion(quizId: string, index: number, afterMs = 0) {
  await requireStaff();
  const now = new Date();
  const closeAt = new Date(now.getTime() + Math.max(0, Math.min(afterMs, 10_000)));
  await prisma.liveQuiz.updateMany({
    // Only a question that has actually opened: closing one still in its
    // get-ready seconds would show the answer before anyone saw the question.
    // And only ever earlier, never later than the clock already says.
    where: { id: quizId, currentIndex: index, startsAt: { lte: now }, endsAt: { gt: closeAt } },
    data: { endsAt: closeAt },
  });
}

export async function finishQuiz(quizId: string) {
  await requireStaff();
  await prisma.liveQuiz.updateMany({
    where: { id: quizId, status: { not: "FINISHED" } },
    data: { status: "FINISHED", finishedAt: new Date() },
  });
  revalidatePath("/admin/live");
}

/**
 * Takes a player out of the game - usually for the name they chose. Their
 * answers stop counting towards anything shown, and their token stops working.
 */
export async function removePlayer(quizId: string, participantId: string) {
  await requireStaff();
  await prisma.liveParticipant.updateMany({
    where: { id: participantId, quizId },
    data: { removed: true },
  });
}

export async function deleteLiveQuiz(quizId: string) {
  await requireStaff();
  await prisma.liveQuiz.delete({ where: { id: quizId } }).catch(() => undefined);
  revalidatePath("/admin/live");
  redirect("/admin/live");
}

export type AnswerBreakdown = {
  /** Who chose each option, by choice id, fastest-scoring first. */
  byChoice: Record<string, { id: string; name: string; points: number }[]>;
  /** Players in the game with no answer to this question. */
  unanswered: { id: string; name: string }[];
};

/**
 * Who answered what on one question - for the host, once it is revealed.
 *
 * A staff action rather than part of the state every phone polls: phones
 * have no use for it, it would multiply the size of what a hundred of them
 * download every two seconds, and it keeps a room's answers, by name, out of
 * a public URL.
 */
export async function getAnswerBreakdown(quizId: string, index: number): Promise<AnswerBreakdown> {
  await requireStaff();
  const [players, answers] = await Promise.all([
    prisma.liveParticipant.findMany({
      where: { quizId, removed: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.liveAnswer.findMany({
      where: { quizId, questionIndex: index, participant: { removed: false } },
      orderBy: { points: "desc" },
      select: { participantId: true, choiceId: true, points: true },
    }),
  ]);

  const nameOf = new Map(players.map((p) => [p.id, p.name]));
  const byChoice: AnswerBreakdown["byChoice"] = {};
  for (const a of answers) {
    (byChoice[a.choiceId] ??= []).push({
      id: a.participantId,
      name: nameOf.get(a.participantId) ?? "?",
      points: a.points,
    });
  }
  const answered = new Set(answers.map((a) => a.participantId));
  return { byChoice, unanswered: players.filter((p) => !answered.has(p.id)) };
}
