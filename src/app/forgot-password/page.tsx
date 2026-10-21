import { headers } from "next/headers";
import { AuthCard } from "@/components/auth-card";
import { ForgotPasswordForm } from "@/components/password-forms";
import { isPaymentHost } from "@/lib/fees";
import { getUiLang } from "@/lib/i18n.server";
import { authText } from "@/lib/text/auth";

export default async function ForgotPasswordPage() {
  // The payment site is the admin's alone and stays in English.
  const onPaymentSite = isPaymentHost((await headers()).get("host"));
  const lang = onPaymentSite ? "en" : await getUiLang();
  return (
    <AuthCard title={authText[lang].forgotTitle} showLanguage={!onPaymentSite}>
      <ForgotPasswordForm lang={lang} />
    </AuthCard>
  );
}
