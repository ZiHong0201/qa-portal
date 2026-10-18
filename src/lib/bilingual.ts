/**
 * One language out of a bilingual question.
 *
 * Bilingual papers (the Science ones) are stored the way they are printed,
 * Malay first, then English, so the admin edits a single text and the two
 * versions can never drift apart. They are pulled apart only for display:
 *
 *  - a paragraph of exactly two lines is "Malay line\nEnglish line";
 *  - anything else - a table kept as "cell | cell" rows, a caption - is
 *    split piece by piece, where "Malay / English" (spaces around the slash)
 *    becomes one side or the other;
 *  - a piece with no " / " is the same in both languages ("Nitrogen", "0.18 m")
 *    and is left alone. So is one with two or more, which is not a pair.
 *
 * Units such as "kJ/g" have no spaces around the slash and are never split.
 */

export type QuestionLanguage = "ms" | "en" | "both";

export const LANGUAGE_LABELS: Record<QuestionLanguage, string> = {
  ms: "BM",
  en: "English",
  both: "Both",
};

export function isQuestionLanguage(v: unknown): v is QuestionLanguage {
  return v === "ms" || v === "en" || v === "both";
}

const side = (lang: "ms" | "en") => (lang === "ms" ? 0 : 1);

/** "Malay / English" -> one side; anything else unchanged. */
function pickPair(piece: string, lang: "ms" | "en"): string {
  const parts = piece.split(" / ");
  if (parts.length !== 2) return piece;
  const [ms, en] = parts.map((p) => p.trim());
  if (lang === "en") return en;
  // A table heading prints its unit once, after the English: "Jisim / Mass
  // (g)" means "(g)" for both. Without this the BM column loses its unit.
  const unit = en.match(/ (\([^()]*\))$/);
  return unit && !ms.includes("(") ? `${ms} ${unit[1]}` : ms;
}

/** A line of a table or a caption, split cell by cell. */
function pickLine(line: string, lang: "ms" | "en"): string {
  return line
    .split(" | ")
    .map((cell) => pickPair(cell, lang))
    .join(" | ");
}

/** A question body or explanation, paragraph by paragraph. */
export function pickBody(text: string, lang: QuestionLanguage): string {
  if (lang === "both") return text;
  // A question saved from the admin form comes back with "\r\n" line breaks.
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => {
      const lines = p.split("\n");
      if (lines.length === 2 && !lines.some((l) => l.includes(" | "))) return lines[side(lang)];
      return lines.map((l) => pickLine(l, lang)).join("\n");
    })
    .join("\n\n");
}

/** An option, or the correct answer quoted back after answering. */
export function pickChoice(text: string, lang: QuestionLanguage): string {
  return lang === "both" ? text : pickPair(text, lang);
}
