import { cookies } from "next/headers";
import { UI_LANG_COOKIE, isUiLang, type UiLang } from "@/lib/i18n";

/**
 * The visitor's chosen language for the portal's text, English by default.
 * For server components and server actions on the student side; admin pages
 * do not call this and stay in English.
 */
export async function getUiLang(): Promise<UiLang> {
  const value = (await cookies()).get(UI_LANG_COOKIE)?.value;
  return isUiLang(value) ? value : "en";
}
