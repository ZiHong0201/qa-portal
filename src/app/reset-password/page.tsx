import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { AuthCard } from "@/components/auth-card";
import { ResetPasswordForm } from "@/components/password-forms";
import { isPaymentHost } from "@/lib/fees";
import { getUiLang } from "@/lib/i18n.server";
import { checkResetToken } from "@/lib/password.server";
import { authText } from "@/lib/text/auth";

// The token is in this page's address; no link out of it may carry it along.
export const metadata: Metadata = { referrer: "no-referrer" };

/** Opened from the link in a "forgot password" email. */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const state = await checkResetToken(token);
  // A link sent from the payment site opens there, and stays in English.
  const onPaymentSite = isPaymentHost((await headers()).get("host"));
  const lang = onPaymentSite ? "en" : await getUiLang();
  const t = authText[lang];

  return (
    <AuthCard title={t.resetTitle} showLanguage={!onPaymentSite}>
      {state === "ok" ? (
        <ResetPasswordForm token={token} lang={lang} />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {t.linkWhy[state]}
          </p>
          <Link href="/forgot-password" className="text-center text-sm font-medium text-sky-700 hover:underline">
            {t.askNewLink}
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
