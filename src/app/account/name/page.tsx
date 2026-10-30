import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AuthCard } from "@/components/auth-card";
import { EditNameForm } from "@/components/password-forms";
import { accountPage } from "../account-page";

/** Anyone logged in changes the name the portal shows for them here. */
export default async function EditNamePage() {
  const { session, onPaymentSite, lang, t } = await accountPage("/account/name");
  // The form starts from the stored name, not the session's copy of it.
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });

  return (
    <AuthCard title={t.editName} showLanguage={!onPaymentSite}>
      <p className="mb-4 text-sm text-slate-600">{t.editNameHelp}</p>
      <EditNameForm lang={lang} initialName={user?.name ?? session.user.name ?? ""} />
      <Link href="/account" className="mt-4 block text-center text-sm font-medium text-sky-700 hover:underline">
        {t.backToProfile}
      </Link>
    </AuthCard>
  );
}
