import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AuthCard } from "@/components/auth-card";
import { accountPage } from "./account-page";

/**
 * The profile: who you are, and the way in to changing your name or
 * password, each on its own page. Anyone logged in - student, teacher or
 * admin - reaches it by their name at the top of every page.
 */
export default async function ProfilePage({ searchParams }: PageProps<"/account">) {
  const { session, onPaymentSite, t } = await accountPage("/account");
  const { saved } = await searchParams;

  // Read fresh rather than from the session, which can trail a change by a
  // minute - and the session does not carry the grade or subjects at all.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      role: true,
      grade: true,
      subjects: { select: { subject: true }, orderBy: { subject: "asc" } },
    },
  });
  const name = user?.name ?? session.user.name ?? "";
  const role = user?.role ?? session.user.role;
  const isStudent = role === "STUDENT";
  const back = onPaymentSite ? "/payment" : isStudent ? "/dashboard" : "/admin";

  const details: { label: string; value: string }[] = [
    { label: t.nameLabel, value: name },
    { label: t.email, value: user?.email ?? session.user.email ?? "" },
    ...(isStudent
      ? [
          { label: t.gradeLabel, value: user?.grade ?? t.notSetYet },
          {
            label: t.subjectsLabel,
            value: user?.subjects.length ? user.subjects.map((s) => s.subject).join(", ") : t.notSetYet,
          },
        ]
      : [{ label: t.roleLabel, value: t.roles[role] }]),
  ];

  return (
    <AuthCard title={t.profileTitle} showLanguage={!onPaymentSite}>
      {saved === "name" && (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          {t.nameChanged}
        </p>
      )}

      <div className="mb-5 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-2xl font-bold text-white shadow-md"
        >
          {name.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-slate-900">{name}</p>
          <p className="truncate text-sm text-slate-500">{user?.email ?? session.user.email}</p>
        </div>
      </div>

      <dl className="mb-5 divide-y divide-slate-200/70 rounded-xl border border-slate-200 bg-white/80 text-sm">
        {details.map((d) => (
          <div key={d.label} className="flex gap-3 px-3 py-2.5">
            <dt className="w-20 shrink-0 text-slate-500">{d.label}</dt>
            <dd className="min-w-0 break-words font-medium text-slate-800">{d.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-2">
        <ProfileLink href="/account/name" label={t.editName} />
        <ProfileLink href="/account/password" label={t.changePassword} />
      </div>

      <Link href={back} className="mt-5 block text-center text-sm font-medium text-sky-700 hover:underline">
        {t.back}
      </Link>
    </AuthCard>
  );
}

function ProfileLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-sky-200 bg-white px-4 py-3 font-semibold text-sky-800 shadow-sm transition-all hover:border-sky-300 hover:bg-sky-50 active:scale-[0.99]"
    >
      {label}
      <span aria-hidden="true" className="text-sky-400">
        &rsaquo;
      </span>
    </Link>
  );
}
