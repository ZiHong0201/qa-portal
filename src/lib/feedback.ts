// Pure feedback logic: question types, labels, limits and the credit line.
// Kept free of Prisma so the student's form and the admin's question editor
// can import it without pulling the database client into the browser bundle.
// The queries live in feedback.server.ts and feedback-questions.server.ts.

import type { UiLang } from "@/lib/i18n";

// ---- the admin's questions ------------------------------------------------------

export const QUESTION_TYPES = ["LONG_TEXT", "SHORT_TEXT", "STARS", "YES_NO", "CHOICE"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  LONG_TEXT: "Long answer",
  SHORT_TEXT: "Short answer",
  STARS: "1–5 stars",
  YES_NO: "Yes / no",
  CHOICE: "Multiple choice",
};

/**
 * The jobs a question can have beyond the form - see FeedbackQuestion in the
 * schema. Each fixes the question's type, since its answer lands in a column
 * of that shape.
 */
export const QUESTION_ROLES = ["QUOTE", "RATING", "RECOMMEND"] as const;
export type QuestionRole = (typeof QUESTION_ROLES)[number];
export const ROLE_TYPE: Record<QuestionRole, QuestionType> = {
  QUOTE: "LONG_TEXT",
  RATING: "STARS",
  RECOMMEND: "YES_NO",
};
export const ROLE_LABELS: Record<QuestionRole, string> = {
  QUOTE: "Testimonial text",
  RATING: "Overall rating",
  RECOMMEND: "Would recommend",
};
export const isRole = (v: unknown): v is QuestionRole => QUESTION_ROLES.includes(v as QuestionRole);

export const MAX_QUESTIONS = 20;
export const MAX_CHOICES = 12;
export const MAX_LABEL = 200;
export const MAX_HINT = 300;
export const MAX_SHORT_ANSWER = 200;

export type Choice = { en: string; zh: string | null };

/** A question's options from their stored JSON. Anything malformed is no options. */
export function parseChoices(json: string | null): Choice[] {
  if (!json) return [];
  try {
    const raw: unknown = JSON.parse(json);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((c): c is { en: string; zh?: unknown } => typeof c?.en === "string" && c.en.trim() !== "")
      .map((c) => ({ en: c.en, zh: typeof c.zh === "string" && c.zh.trim() ? c.zh : null }));
  } catch {
    return [];
  }
}

/**
 * The editor writes options one per line, the Chinese after a bar:
 * "Idea | 想法". These turn that text into options and back.
 */
export function parseChoiceLines(text: string): Choice[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const bar = line.indexOf("|");
      if (bar === -1) return { en: line, zh: null };
      const zh = line.slice(bar + 1).trim();
      return { en: line.slice(0, bar).trim(), zh: zh || null };
    });
}

export const choiceLines = (choices: Choice[]) =>
  choices.map((c) => (c.zh ? `${c.en} | ${c.zh}` : c.en)).join("\n");

/** The Chinese wording when there is one, else the English. */
export const inLang = (en: string, zh: string | null | undefined, lang: UiLang) =>
  lang === "zh" && zh?.trim() ? zh : en;

/** What the student's form needs of a question, already in their language. */
export type FormQuestion = {
  id: string;
  type: QuestionType;
  role: QuestionRole | null;
  label: string;
  hint: string | null;
  required: boolean;
  /** value is the English wording, which is what gets stored. */
  choices: { value: string; label: string }[];
};

export function toFormQuestion(
  q: {
    id: string;
    type: string;
    role: string | null;
    labelEn: string;
    labelZh: string | null;
    hintEn: string | null;
    hintZh: string | null;
    choices: string | null;
    required: boolean;
  },
  lang: UiLang
): FormQuestion {
  return {
    id: q.id,
    type: q.type as QuestionType,
    role: isRole(q.role) ? q.role : null,
    label: inLang(q.labelEn, q.labelZh, lang),
    hint: q.hintEn ? inLang(q.hintEn, q.hintZh, lang) : null,
    // The message is what a testimonial quotes, so it can never be skipped.
    required: q.role === "QUOTE" || q.required,
    choices: parseChoices(q.choices).map((c) => ({ value: c.en, label: inLang(c.en, c.zh, lang) })),
  };
}

/**
 * A stored answer, worded for the reader: a chosen option comes back in
 * their language while the question still offers it.
 */
export function answerIn(
  answer: { value: string; question: { choices: string | null } | null },
  lang: UiLang
): string {
  const choice = parseChoices(answer.question?.choices ?? null).find((c) => c.en === answer.value);
  return choice ? inLang(choice.en, choice.zh, lang) : answer.value;
}

// ---- sending -------------------------------------------------------------------

export const FEEDBACK_CREDITS = ["FULL_NAME", "FIRST_NAME_GRADE", "ANONYMOUS"] as const;
export type FeedbackCredit = (typeof FEEDBACK_CREDITS)[number];

export const MIN_MESSAGE = 10;
export const MAX_MESSAGE = 1000;
/** The longest "first name" a student may type for the short credit. */
export const MAX_SHORT_NAME = 30;
/**
 * Messages one student may send in any 24 hours. Enough for a burst of ideas
 * after a lesson; not enough to fill the admin's list by holding a key down.
 */
export const FEEDBACK_PER_DAY = 3;

export const ANONYMOUS_CREDIT = "Anonymous student";

/** "★★★★☆" for 4, so a rating reads the same on every page. */
export const stars = (rating: number) => "★".repeat(rating) + "☆".repeat(5 - rating);

/** The PortalSetting key for the admin's on/off switch; "false" means closed. */
export const FEEDBACK_ENABLED_KEY = "feedbackEnabled";
export const FEEDBACK_CLOSED_ERROR = "Feedback is closed for now. Please check back later.";

/**
 * A guess at the name a student goes by, to prefill the short credit.
 *
 * Only ever a starting point the student can change: the first word is the
 * given name for "Aisyah binti Ahmad" but the surname for "Tan Wei Ming", and
 * no rule gets both right. That is why the student types the short name
 * rather than the portal deriving it.
 */
export function guessFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/**
 * The line printed under a quote on the website, exactly as the student chose
 * it. Grade is left off when the account has none rather than printing
 * "Aisyah, null".
 */
export function creditLine(
  credit: FeedbackCredit,
  student: { name: string; grade: string | null },
  shortName: string
): string {
  if (credit === "FULL_NAME") return student.name.trim();
  if (credit === "FIRST_NAME_GRADE") {
    const name = shortName.trim();
    return student.grade ? `${name}, ${student.grade}` : name;
  }
  return ANONYMOUS_CREDIT;
}

export type Testimonial = { quote: string; credit: string; date: string; rating: number | null };

/**
 * Testimonials as CSV for a spreadsheet. A cell that starts with = + - or @
 * is a formula to Excel, and these cells are typed by students, so those get
 * a leading apostrophe. The BOM tells Excel the file is UTF-8, without which
 * an emoji or an accented name comes out as mojibake.
 */
export function testimonialsCsv(rows: Testimonial[]): string {
  const cell = (v: string) => {
    const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const lines = [
    ["quote", "credit", "date", "rating"],
    ...rows.map((r) => [r.quote, r.credit, r.date, r.rating === null ? "" : String(r.rating)]),
  ];
  return "﻿" + lines.map((l) => l.map(cell).join(",")).join("\r\n") + "\r\n";
}
