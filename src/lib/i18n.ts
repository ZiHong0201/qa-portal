// The language the portal's own text is shown in - buttons, headings, help.
// Not to be confused with the question language in bilingual.ts: question
// sets stay in BI/BM whatever is picked here, and so does anything staff type
// in (set titles, announcements, subject and grade names).
//
// Only the student side is translated. Admin and teacher pages stay in
// English, and the admin layout pins the language to "en" so the few pieces
// it shares with the student side (the install banner, the notices under the
// nav) do not switch to Chinese around English pages.
//
// Kept free of server-only imports so client components can use it too.

export const UI_LANGS = ["en", "zh"] as const;
export type UiLang = (typeof UI_LANGS)[number];

/** Kept in a cookie, so the choice holds on the login page too. */
export const UI_LANG_COOKIE = "uiLang";

export function isUiLang(v: unknown): v is UiLang {
  return v === "en" || v === "zh";
}

/**
 * Declares one area's text in both languages. Typed so the Chinese must have
 * exactly the keys the English has: a string added to one and forgotten in
 * the other fails the typecheck instead of showing up blank.
 *
 * Values may be functions for text with numbers or names in it.
 */
export function defineText<T>(text: { en: T; zh: NoInfer<T> }): Record<UiLang, T> {
  return text;
}

/** For toLocaleDateString and friends. */
export function dateLocale(lang: UiLang): string {
  return lang === "zh" ? "zh-CN" : "en-GB";
}
