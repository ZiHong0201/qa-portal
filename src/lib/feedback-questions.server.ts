import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Result } from "@/lib/password.server";
import {
  MAX_CHOICES,
  MAX_HINT,
  MAX_LABEL,
  MAX_QUESTIONS,
  QUESTION_TYPES,
  ROLE_TYPE,
  isRole,
  parseChoiceLines,
  type QuestionRole,
} from "@/lib/feedback";

// The admin's questions for the student Feedback form. See FeedbackQuestion
// in the schema for what a role is and why the QUOTE question cannot go.

const ORDER = [{ order: "asc" as const }, { createdAt: "asc" as const }];

/** Every question in form order, hidden ones too - for the editor. */
export function allQuestions() {
  return prisma.feedbackQuestion.findMany({ orderBy: ORDER });
}

/** The questions students are asked, in order. */
export function formQuestions() {
  return prisma.feedbackQuestion.findMany({ where: { hidden: false }, orderBy: ORDER });
}

/** The role a STARS or YES_NO question can take on; other types have none. */
const roleFor = (type: string): QuestionRole | null =>
  type === "STARS" ? "RATING" : type === "YES_NO" ? "RECOMMEND" : null;

const saveSchema = z.object({
  labelEn: z
    .string()
    .trim()
    .min(1, "Write the question in English.")
    .max(MAX_LABEL, `Keep the question under ${MAX_LABEL} characters.`),
  labelZh: z.string().trim().max(MAX_LABEL, `Keep the question under ${MAX_LABEL} characters.`),
  hintEn: z.string().trim().max(MAX_HINT, `Keep the hint under ${MAX_HINT} characters.`),
  hintZh: z.string().trim().max(MAX_HINT, `Keep the hint under ${MAX_HINT} characters.`),
  type: z.enum(QUESTION_TYPES, "Choose a type of answer."),
  required: z.boolean(),
  useAsRole: z.boolean(),
  choices: z.string(),
});

const text = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * Adds a question (id null) or changes one. A question with a role keeps the
 * type the role needs; the QUOTE question also stays required. A STARS or
 * YES_NO question can take the rating or "would recommend" role while no
 * other question holds it, and give it up again by unticking it.
 */
export async function saveQuestion(
  id: string | null,
  input: {
    labelEn: unknown;
    labelZh: unknown;
    hintEn: unknown;
    hintZh: unknown;
    type: unknown;
    required: boolean;
    useAsRole: boolean;
    choices: unknown;
  }
): Promise<Result> {
  const existing = id ? await prisma.feedbackQuestion.findUnique({ where: { id } }) : null;
  if (id && !existing) return { error: "That question has been deleted." };
  const had = isRole(existing?.role) ? existing.role : null;
  const keepRole = had === "QUOTE" || (had !== null && input.useAsRole);

  const parsed = saveSchema.safeParse({
    labelEn: text(input.labelEn),
    labelZh: text(input.labelZh),
    hintEn: text(input.hintEn),
    hintZh: text(input.hintZh),
    // A role fixes the type, so the editor greys the box out and sends none.
    type: keepRole && had ? ROLE_TYPE[had] : input.type,
    required: input.required,
    useAsRole: input.useAsRole,
    choices: text(input.choices),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  let choices: string | null = null;
  if (d.type === "CHOICE") {
    const list = parseChoiceLines(d.choices);
    if (list.length < 2) return { error: "Give at least two options, one per line." };
    if (list.length > MAX_CHOICES) return { error: `Give at most ${MAX_CHOICES} options.` };
    if (list.some((c) => !c.en || c.en.length > 100 || (c.zh?.length ?? 0) > 100)) {
      return { error: "Each option needs English wording, under 100 characters." };
    }
    if (new Set(list.map((c) => c.en.toLowerCase())).size !== list.length) {
      return { error: "Two options have the same English wording." };
    }
    choices = JSON.stringify(list);
  }

  let role: QuestionRole | null = keepRole ? had : null;
  if (!keepRole && d.useAsRole) {
    const wanted = roleFor(d.type);
    if (wanted) {
      const holder = await prisma.feedbackQuestion.findUnique({ where: { role: wanted }, select: { id: true } });
      if (holder && holder.id !== id) return { error: "Another question already does that job." };
      role = wanted;
    }
  }

  const data = {
    labelEn: d.labelEn,
    labelZh: d.labelZh || null,
    hintEn: d.hintEn || null,
    hintZh: d.hintZh || null,
    type: d.type,
    role,
    choices,
    required: role === "QUOTE" || d.required,
  };

  try {
    if (existing) {
      await prisma.feedbackQuestion.update({ where: { id: existing.id }, data });
    } else {
      const [count, last] = await Promise.all([
        prisma.feedbackQuestion.count(),
        prisma.feedbackQuestion.findFirst({ orderBy: { order: "desc" }, select: { order: true } }),
      ]);
      if (count >= MAX_QUESTIONS) return { error: `The form can have at most ${MAX_QUESTIONS} questions.` };
      await prisma.feedbackQuestion.create({ data: { ...data, order: (last?.order ?? -1) + 1 } });
    }
  } catch {
    // The unique role: two saves at once both taking the rating, say.
    return { error: "Another question already does that job." };
  }
  return {};
}

/** Swaps a question with its neighbour, then numbers them all afresh. */
export async function moveQuestion(id: string, direction: -1 | 1): Promise<void> {
  const ids = (await prisma.feedbackQuestion.findMany({ orderBy: ORDER, select: { id: true } })).map((q) => q.id);
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from === -1 || to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  await prisma.$transaction(ids.map((qid, order) => prisma.feedbackQuestion.update({ where: { id: qid }, data: { order } })));
}

/** Hiding keeps the question and its answers; the message is never hidden. */
export async function setQuestionHidden(id: string, hidden: boolean): Promise<void> {
  await prisma.feedbackQuestion.updateMany({
    where: { id, OR: [{ role: null }, { role: { not: "QUOTE" } }] },
    data: { hidden },
  });
}

/**
 * Deleting keeps what students already answered: each answer holds the
 * question's wording, and only loses its link to the question.
 */
export async function deleteQuestion(id: string): Promise<void> {
  await prisma.feedbackQuestion.deleteMany({ where: { id, OR: [{ role: null }, { role: { not: "QUOTE" } }] } });
}
