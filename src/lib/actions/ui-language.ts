"use server";

import { cookies } from "next/headers";
import { UI_LANG_COOKIE, isUiLang } from "@/lib/i18n";

/**
 * Remembers which language the portal's text is shown in. A cookie rather
 * than a column on the account, so it works before logging in as well; it
 * lasts a year on that device. Setting it from a server action re-renders
 * the page in the same round trip, so there is nothing to revalidate.
 */
export async function setUiLanguage(lang: string): Promise<void> {
  if (!isUiLang(lang)) return;
  (await cookies()).set(UI_LANG_COOKIE, lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
