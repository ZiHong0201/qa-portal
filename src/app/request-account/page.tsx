import { headers } from "next/headers";
import { AuthCard } from "@/components/auth-card";
import { RequestAccountForm } from "@/components/password-forms";
import { isPaymentHost } from "@/lib/fees";
import { getUiLang } from "@/lib/i18n.server";
import { authText } from "@/lib/text/auth";

export default async function RequestAccountPage() {
  // Not linked from the payment site, but reachable there; English if so.
  const onPaymentSite = isPaymentHost((await headers()).get("host"));
  const lang = onPaymentSite ? "en" : await getUiLang();
  return (
    <AuthCard title={authText[lang].requestTitle} showLanguage={!onPaymentSite}>
      <RequestAccountForm lang={lang} />
    </AuthCard>
  );
}
