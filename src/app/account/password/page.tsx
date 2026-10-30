import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { ChangePasswordForm } from "@/components/password-forms";
import { accountPage } from "../account-page";

/** Anyone logged in - student, teacher or admin - changes their own password here. */
export default async function ChangePasswordPage() {
  const { session, onPaymentSite, lang, t } = await accountPage("/account/password");

  return (
    <AuthCard title={t.changePasswordTitle} showLanguage={!onPaymentSite}>
      <p className="mb-4 text-sm text-slate-600">
        {t.loggedInAs}<span className="font-medium text-slate-800">{session.user.name}</span>
        {session.user.email && t.withEmail(session.user.email)}
        {t.fullStop}
      </p>
      <ChangePasswordForm lang={lang} />
      <Link href="/account" className="mt-4 block text-center text-sm font-medium text-sky-700 hover:underline">
        {t.backToProfile}
      </Link>
    </AuthCard>
  );
}
