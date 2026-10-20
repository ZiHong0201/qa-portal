import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isPaymentHost } from "@/lib/fees";
import { AuthCard } from "@/components/auth-card";
import { ChangePasswordForm } from "@/components/password-forms";

/** Anyone logged in - student, teacher or admin - changes their own password here. */
export default async function AccountPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/account");

  const onPaymentSite = isPaymentHost((await headers()).get("host"));
  const back = onPaymentSite ? "/payment" : session.user.role === "STUDENT" ? "/dashboard" : "/admin";

  return (
    <AuthCard title="Change password">
      <p className="mb-4 text-sm text-slate-600">
        Logged in as <span className="font-medium text-slate-800">{session.user.name}</span>
        {session.user.email && <> ({session.user.email})</>}.
      </p>
      <ChangePasswordForm />
      <Link href={back} className="mt-4 block text-center text-sm font-medium text-sky-700 hover:underline">
        Back
      </Link>
    </AuthCard>
  );
}
