import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isPaymentHost } from "@/lib/fees";
import { getUiLang } from "@/lib/i18n.server";
import { authText } from "@/lib/text/auth";

/**
 * What every /account page starts with: the session (or off to log in, and
 * back here afterwards), and the language. Staff use these pages too; they
 * follow the toggle on them, except on the payment site, which stays in
 * English.
 */
export async function accountPage(path: string) {
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(path)}`);

  const onPaymentSite = isPaymentHost((await headers()).get("host"));
  const lang = onPaymentSite ? "en" : await getUiLang();
  return { session, onPaymentSite, lang, t: authText[lang] };
}
