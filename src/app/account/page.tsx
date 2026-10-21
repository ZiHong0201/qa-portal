import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isPaymentHost } from "@/lib/fees";
import { getUiLang } from "@/lib/i18n.server";
import { authText } from "@/lib/text/auth";
import { AuthCard } from "@/components/auth-card";
import { ChangePasswordForm } from "@/components/password-forms";

/** Anyone logged in - student, teacher or admin - changes their own password here. */
export default async function AccountPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/account");

  const onPaymentSite = isPaymentHost((await headers()).get("host"));
  const back = onPaymentSite ? "/payment" : session.user.role === "STUDENT" ? "/dashboard" : "/admin";
  // Staff use this page too; it follows the toggle on it, except on the
  // payment site, which stays in English.
  const lang = onPaymentSite ? "en" : await getUiLang();
  const t = authText[lang];

  return (
    <AuthCard title={t.changePasswordTitle} showLanguage={!onPaymentSite}>
      <p className="mb-4 text-sm text-slate-600">
        {t.loggedInAs}<span className="font-medium text-slate-800">{session.user.name}</span>
        {session.user.email && t.withEmail(session.user.email)}
        {t.fullStop}
      </p>
      <ChangePasswordForm lang={lang} />
      <Link href={back} className="mt-4 block text-center text-sm font-medium text-sky-700 hover:underline">
        {t.back}
      </Link>
    </AuthCard>
  );
}
