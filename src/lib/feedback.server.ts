import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { Result } from "@/lib/password.server";
import { dayKey } from "@/lib/check-in";
import {
  FEEDBACK_CREDITS,
  FEEDBACK_ENABLED_KEY,
  FEEDBACK_PER_DAY,
  MAX_MESSAGE,
  MAX_SHORT_ANSWER,
  MAX_SHORT_NAME,
  MIN_MESSAGE,
  creditLine,
  inLang,
  parseChoices,
  type Testimonial,
} from "@/lib/feedback";
import { formQuestions } from "@/lib/feedback-questions.server";
import type { UiLang } from "@/lib/i18n";
import { feedbackText } from "@/lib/text/feedback";

const DAY_MS = 24 * 60 * 60 * 1000;

// One schema per language, so its messages come back in the student's. The
// answers to the admin's questions are checked one by one in sendFeedback,
// since the questions are only known once read from the database.
const creditSchemaIn = (t: (typeof feedbackText)[UiLang]) =>
  z
    .object({
      mayQuote: z.boolean(),
      credit: z.enum(FEEDBACK_CREDITS).nullable(),
      shortName: z.string().trim().max(MAX_SHORT_NAME, t.nameTooLong),
    })
    .refine((v) => !v.mayQuote || v.credit !== null, t.chooseCredit)
    .refine((v) => !v.mayQuote || v.credit !== "FIRST_NAME_GRADE" || v.shortName.length > 0, t.typeShortName);

const creditSchemas = { en: creditSchemaIn(feedbackText.en), zh: creditSchemaIn(feedbackText.zh) };

/**
 * Whether students can send feedback. Open unless an admin has closed it, so
 * a database with no setting row behaves as before the switch existed.
 */
export async function isFeedbackEnabled(): Promise<boolean> {
  const row = await prisma.portalSetting.findUnique({ where: { key: FEEDBACK_ENABLED_KEY } });
  return row?.value !== "false";
}

export async function setFeedbackEnabled(enabled: boolean): Promise<void> {
  const value = enabled ? "true" : "false";
  await prisma.portalSetting.upsert({
    where: { key: FEEDBACK_ENABLED_KEY },
    create: { key: FEEDBACK_ENABLED_KEY, value },
    update: { value },
  });
}

/**
 * Records a message from a student: their answers to the questions on the
 * form now, and how they would like to be named if it is quoted. Quoting is
 * off unless mayQuote, and the credit is only kept when it is on - a credit
 * left over in the form leaves nothing behind that could be mistaken for
 * permission.
 *
 * `answers` is keyed by question id. Questions hidden or deleted since the
 * form was loaded are ignored; one added since is checked like any other,
 * so a required question the student never saw sends them back to fill it in.
 *
 * Errors are in `lang`, English unless told otherwise. The stored credit line
 * and answers are not: the website prints them, and the admin reads English.
 */
export async function sendFeedback(
  studentId: string,
  input: {
    answers: Record<string, unknown>;
    mayQuote: boolean;
    credit: unknown;
    shortName: unknown;
  },
  lang: UiLang = "en"
): Promise<Result> {
  const t = feedbackText[lang];
  const parsed = creditSchemas[lang].safeParse({
    mayQuote: input.mayQuote,
    credit: input.mayQuote ? (input.credit ?? null) : null,
    shortName: typeof input.shortName === "string" ? input.shortName : "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { mayQuote, credit, shortName } = parsed.data;

  const [questions, student, left, open] = await Promise.all([
    formQuestions(),
    prisma.user.findFirst({ where: { id: studentId, role: "STUDENT" }, select: { name: true, grade: true } }),
    feedbackLeftToday(studentId),
    isFeedbackEnabled(),
  ]);
  if (!student) return { error: t.studentsOnly };
  // A page left open from before the admin closed it still has its form.
  if (!open) return { error: t.closed };
  // Two tabs sending at the same instant can both slip under this. That costs
  // one extra message, which is not worth a transaction to prevent.
  if (left <= 0) {
    return { error: t.dailyLimit(FEEDBACK_PER_DAY) };
  }
  if (!questions.some((q) => q.role === "QUOTE")) return { error: t.notReady };

  let message = "";
  let rating: number | null = null;
  let wouldRecommend: boolean | null = null;
  const answers: { questionId: string; label: string; value: string; order: number }[] = [];

  for (const [order, q] of questions.entries()) {
    const label = inLang(q.labelEn, q.labelZh, lang);
    const raw = input.answers[q.id];
    const given = typeof raw === "string" ? raw.trim() : "";
    if (!given) {
      if (q.role === "QUOTE" || q.required) return { error: t.answerRequired(label) };
      continue;
    }

    let value: string;
    if (q.type === "LONG_TEXT" || q.type === "SHORT_TEXT") {
      const max = q.type === "LONG_TEXT" ? MAX_MESSAGE : MAX_SHORT_ANSWER;
      if (given.length > max) return { error: t.answerTooLong(label, max) };
      if (q.role === "QUOTE" && given.length < MIN_MESSAGE) return { error: t.minMessage(MIN_MESSAGE) };
      value = given;
    } else if (q.type === "STARS") {
      const n = Number(given);
      if (!Number.isInteger(n) || n < 1 || n > 5) return { error: t.chooseStars };
      value = String(n);
    } else if (q.type === "YES_NO") {
      if (given !== "yes" && given !== "no") return { error: t.yesOrNo };
      value = given;
    } else {
      const choice = parseChoices(q.choices).find((c) => c.en === given);
      if (!choice) return { error: t.chooseOne(label) };
      value = choice.en;
    }

    if (q.role === "QUOTE") message = value;
    else if (q.role === "RATING") rating = Number(value);
    else if (q.role === "RECOMMEND") wouldRecommend = value === "yes";
    else answers.push({ questionId: q.id, label: q.labelEn, value, order });
  }

  await prisma.feedback.create({
    data: {
      studentId,
      studentName: student.name,
      studentGrade: student.grade,
      message,
      rating,
      wouldRecommend,
      mayQuote,
      credit: mayQuote ? credit : null,
      creditLine: mayQuote && credit ? creditLine(credit, student, shortName) : null,
      answers: { create: answers },
    },
  });
  return { success: t.sent };
}

/**
 * How many more messages this student may send right now. A rolling 24 hours
 * rather than a calendar day, so sending three at 11pm does not buy three
 * more at midnight. The form shows this too, so it never offers a send that
 * would then be refused.
 */
export async function feedbackLeftToday(studentId: string): Promise<number> {
  const recent = await prisma.feedback.count({
    where: { studentId, createdAt: { gt: new Date(Date.now() - DAY_MS) } },
  });
  return Math.max(0, FEEDBACK_PER_DAY - recent);
}

/** What a student has sent, newest first, for their own page. */
export function myFeedback(studentId: string) {
  return prisma.feedback.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      message: true,
      answers: {
        orderBy: { order: "asc" },
        select: {
          label: true,
          value: true,
          question: { select: { type: true, labelEn: true, labelZh: true, choices: true } },
        },
      },
      rating: true,
      wouldRecommend: true,
      mayQuote: true,
      creditLine: true,
      readAt: true,
      createdAt: true,
    },
  });
}

/**
 * A student taking back permission to quote. Also takes the star off, so the
 * message drops out of the next export without the admin having to notice.
 * Allowed while feedback is closed too: it only ever narrows what we may do
 * with their words.
 * Scoped to the student's own rows - an id from someone else changes nothing.
 */
export async function withdrawQuote(studentId: string, feedbackId: string): Promise<void> {
  await prisma.feedback.updateMany({
    where: { id: feedbackId, studentId },
    data: { mayQuote: false, credit: null, creditLine: null, starredAt: null },
  });
}

// ---- the admin's side ---------------------------------------------------------

export type FeedbackView = "inbox" | "starred" | "archived";

export type FeedbackFilter = {
  view: FeedbackView;
  /** Only messages that gave this answer to a multiple-choice question. */
  answer: { questionId: string; value: string } | null;
  /** true: only those the student allowed quoting; false: only those they didn't. */
  quote: boolean | null;
};

export function listFeedback(filter: FeedbackFilter) {
  const where: Prisma.FeedbackWhereInput = {
    archivedAt: filter.view === "archived" ? { not: null } : null,
    ...(filter.view === "starred" ? { starredAt: { not: null } } : {}),
    ...(filter.answer ? { answers: { some: filter.answer } } : {}),
    ...(filter.quote !== null ? { mayQuote: filter.quote } : {}),
  };
  return prisma.feedback.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      answers: {
        orderBy: { order: "asc" },
        select: { label: true, value: true, question: { select: { type: true } } },
      },
    },
  });
}

/**
 * The star average and how many would recommend Mr Tan, over every message
 * that answered - archived ones too, since archiving only tidies the inbox.
 * Counted per message, not per student, so one student's three messages
 * count three times.
 */
export async function ratingSummary() {
  const [stars, yes, answered] = await Promise.all([
    prisma.feedback.aggregate({ _avg: { rating: true }, _count: { rating: true } }),
    prisma.feedback.count({ where: { wouldRecommend: true } }),
    prisma.feedback.count({ where: { wouldRecommend: { not: null } } }),
  ]);
  return { average: stars._avg.rating, ratings: stars._count.rating, recommendYes: yes, recommendAnswered: answered };
}

/** Unread and not archived: what the overview card counts. */
export function unreadFeedbackCount() {
  return prisma.feedback.count({ where: { readAt: null, archivedAt: null } });
}

export async function setFeedbackRead(id: string, read: boolean): Promise<void> {
  await prisma.feedback.updateMany({ where: { id }, data: { readAt: read ? new Date() : null } });
}

export async function markAllFeedbackRead(): Promise<void> {
  await prisma.feedback.updateMany({ where: { readAt: null }, data: { readAt: new Date() } });
}

/**
 * Stars a message as a testimonial. The permission check is in the update's
 * own where clause, not a read beforehand, so a student withdrawing at the
 * same moment cannot be overtaken by the star.
 */
export async function setFeedbackStarred(id: string, starred: boolean): Promise<Result> {
  if (!starred) {
    await prisma.feedback.updateMany({ where: { id }, data: { starredAt: null } });
    return {};
  }
  const { count } = await prisma.feedback.updateMany({
    where: { id, mayQuote: true, archivedAt: null },
    data: { starredAt: new Date(), readAt: new Date() },
  });
  if (!count) return { error: "Only messages the student allowed us to quote can be starred." };
  return {};
}

/**
 * Archiving takes the star off too, so "starred" always means exactly what
 * the export will contain. It also counts as read: an archived message is
 * one the admin has dealt with.
 */
export async function setFeedbackArchived(id: string, archived: boolean): Promise<void> {
  if (archived) {
    const now = new Date();
    await prisma.$transaction([
      prisma.feedback.updateMany({ where: { id }, data: { archivedAt: now, starredAt: null } }),
      prisma.feedback.updateMany({ where: { id, readAt: null }, data: { readAt: now } }),
    ]);
  } else {
    await prisma.feedback.updateMany({ where: { id }, data: { archivedAt: null } });
  }
}

const TESTIMONIAL_WHERE: Prisma.FeedbackWhereInput = {
  starredAt: { not: null },
  archivedAt: null,
  mayQuote: true,
  creditLine: { not: null },
};

/** How many testimonials the export would hold. */
export function testimonialCount() {
  return prisma.feedback.count({ where: TESTIMONIAL_WHERE });
}

/**
 * The starred testimonials, ready for the website. Built from the quote, the
 * credit line the student chose and their star rating, so no email, account
 * id or full name can reach the file unless the student picked their full
 * name as the credit. mayQuote is checked again here rather than trusted to
 * the star, as the last gate before anything leaves the portal.
 */
export async function starredTestimonials(): Promise<Testimonial[]> {
  const rows = await prisma.feedback.findMany({
    where: TESTIMONIAL_WHERE,
    orderBy: { createdAt: "desc" },
    select: { message: true, creditLine: true, createdAt: true, rating: true },
  });
  return rows.map((r) => ({
    quote: r.message,
    credit: r.creditLine!,
    date: dayKey(r.createdAt),
    rating: r.rating,
  }));
}
