import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { Result } from "@/lib/password.server";
import { dayKey } from "@/lib/check-in";
import {
  FEEDBACK_CLOSED_ERROR,
  FEEDBACK_CREDITS,
  FEEDBACK_ENABLED_KEY,
  FEEDBACK_KINDS,
  FEEDBACK_PER_DAY,
  MAX_MESSAGE,
  MAX_SHORT_NAME,
  MIN_MESSAGE,
  creditLine,
  type FeedbackKind,
  type Testimonial,
} from "@/lib/feedback";

const DAY_MS = 24 * 60 * 60 * 1000;

const sendSchema = z
  .object({
    kind: z.enum(FEEDBACK_KINDS, "Choose idea, suggestion or feedback."),
    message: z
      .string()
      .trim()
      .min(MIN_MESSAGE, `Write at least ${MIN_MESSAGE} characters.`)
      .max(MAX_MESSAGE, `Keep it under ${MAX_MESSAGE} characters.`),
    mayQuote: z.boolean(),
    credit: z.enum(FEEDBACK_CREDITS).nullable(),
    shortName: z.string().trim().max(MAX_SHORT_NAME, "That name is too long."),
    rating: z.number("Choose 1 to 5 stars.").int().min(1, "Choose 1 to 5 stars.").max(5, "Choose 1 to 5 stars.").nullable(),
    wouldRecommend: z.boolean("Answer yes or no.").nullable(),
  })
  .refine((v) => !v.mayQuote || v.credit !== null, "Choose how you'd like to be named.")
  .refine(
    (v) => !v.mayQuote || v.credit !== "FIRST_NAME_GRADE" || v.shortName.length > 0,
    "Type the name you'd like shown."
  );

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
 * Records a message from a student. Quoting is off unless the student ticked
 * it, and the credit is only kept when they did - an unticked box with a
 * credit still picked in the form (they ticked, chose, then unticked) leaves
 * nothing behind that could be mistaken for permission.
 */
export async function sendFeedback(
  studentId: string,
  input: {
    kind: unknown;
    message: unknown;
    mayQuote: boolean;
    credit: unknown;
    shortName: unknown;
    rating?: unknown;
    recommend?: unknown;
  }
): Promise<Result> {
  // Both questions are optional: nothing sent means skipped. Anything else
  // that is not a real answer is passed through for the schema to refuse.
  const skipped = (v: unknown) => v === null || v === undefined || v === "";
  const parsed = sendSchema.safeParse({
    kind: input.kind,
    message: input.message,
    mayQuote: input.mayQuote,
    credit: input.mayQuote ? (input.credit ?? null) : null,
    shortName: input.shortName ?? "",
    rating: skipped(input.rating) ? null : Number(input.rating),
    wouldRecommend: skipped(input.recommend)
      ? null
      : input.recommend === "yes"
        ? true
        : input.recommend === "no"
          ? false
          : input.recommend,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { kind, message, mayQuote, credit, shortName, rating, wouldRecommend } = parsed.data;

  const [student, left, open] = await Promise.all([
    prisma.user.findFirst({ where: { id: studentId, role: "STUDENT" }, select: { name: true, grade: true } }),
    feedbackLeftToday(studentId),
    isFeedbackEnabled(),
  ]);
  if (!student) return { error: "Feedback is for students only." };
  // A page left open from before the admin closed it still has its form.
  if (!open) return { error: FEEDBACK_CLOSED_ERROR };
  // Two tabs sending at the same instant can both slip under this. That costs
  // one extra message, which is not worth a transaction to prevent.
  if (left <= 0) {
    return {
      error: `You've sent ${FEEDBACK_PER_DAY} messages in the last 24 hours. Thank you! Please send the next one tomorrow.`,
    };
  }

  await prisma.feedback.create({
    data: {
      studentId,
      studentName: student.name,
      studentGrade: student.grade,
      kind,
      message,
      rating,
      wouldRecommend,
      mayQuote,
      credit: mayQuote ? credit : null,
      creditLine: mayQuote && credit ? creditLine(credit, student, shortName) : null,
    },
  });
  return { success: "Sent - thank you! Mr Tan reads every message." };
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
      kind: true,
      message: true,
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
  kind: FeedbackKind | null;
  /** true: only those the student allowed quoting; false: only those they didn't. */
  quote: boolean | null;
};

export function listFeedback(filter: FeedbackFilter) {
  const where: Prisma.FeedbackWhereInput = {
    archivedAt: filter.view === "archived" ? { not: null } : null,
    ...(filter.view === "starred" ? { starredAt: { not: null } } : {}),
    ...(filter.kind ? { kind: filter.kind } : {}),
    ...(filter.quote !== null ? { mayQuote: filter.quote } : {}),
  };
  return prisma.feedback.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
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
