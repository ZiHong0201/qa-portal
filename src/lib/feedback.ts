// Pure feedback logic: labels, limits and the credit line. Kept free of Prisma
// so the student's form can import the constants and preview the credit line
// without pulling the database client into the browser bundle. The queries
// live in feedback.server.ts.

export const FEEDBACK_KINDS = ["IDEA", "SUGGESTION", "FEEDBACK"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const KIND_LABELS: Record<FeedbackKind, string> = {
  IDEA: "Idea",
  SUGGESTION: "Suggestion",
  FEEDBACK: "Feedback",
};

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

export type Testimonial = { quote: string; credit: string; date: string };

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
  const lines = [["quote", "credit", "date"], ...rows.map((r) => [r.quote, r.credit, r.date])];
  return "﻿" + lines.map((l) => l.map(cell).join(",")).join("\r\n") + "\r\n";
}
