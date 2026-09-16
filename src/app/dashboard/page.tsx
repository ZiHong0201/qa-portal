import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCheckInState } from "@/lib/check-in.server";
import { getRankedStudents } from "@/lib/leaderboard";
import { CheckInCard } from "@/components/check-in-card";
import { SubjectArt, themeFor } from "@/components/subject-art";
import { CelebratingCat } from "@/components/celebrating-cat";

type SubjectSummary = {
  subject: string;
  setCount: number;
  questions: number;
  answered: number;
  setsComplete: number;
};

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const firstName = session!.user.name?.split(" ")[0] ?? "there";

  const student = await prisma.user.findUnique({
    where: { id: userId },
    select: { grade: true, subjects: { select: { subject: true } } },
  });
  const subjectNames = (student?.subjects.map((s) => s.subject) ?? []).sort();

  if (!student?.grade || subjectNames.length === 0) {
    return (
      <div className="rounded-2xl border border-sky-100 bg-white p-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-sky-950">Welcome, {firstName}!</h1>
        <p className="text-gray-500">
          Your grade and subjects haven&apos;t been set yet. Ask your teacher to set them and your
          journey will show up here.
        </p>
      </div>
    );
  }

  const [sets, checkIn, ranked] = await Promise.all([
    prisma.questionSet.findMany({
      where: {
        isActive: true,
        grades: { some: { grade: student.grade } },
        subject: { in: subjectNames },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        subject: true,
        questions: {
          where: { isActive: true },
          select: {
            points: true,
            submissions: { where: { studentId: userId }, select: { pointsAwarded: true } },
          },
        },
      },
    }),
    getCheckInState(userId),
    getRankedStudents(),
  ]);

  const setProgress = sets.map((set) => {
    const total = set.questions.length;
    const answered = set.questions.filter((q) => q.submissions.length > 0).length;
    return { ...set, total, answered, complete: total > 0 && answered === total };
  });

  // Prefer the set they're partway through; otherwise the newest untouched one.
  const inProgress = setProgress.filter((s) => s.answered > 0 && !s.complete);
  const nextUp =
    inProgress.sort((a, b) => b.answered / b.total - a.answered / a.total)[0] ??
    setProgress.find((s) => s.answered === 0 && s.total > 0) ??
    null;

  const bySubject = new Map<string, SubjectSummary>();
  for (const name of subjectNames) {
    bySubject.set(name, { subject: name, setCount: 0, questions: 0, answered: 0, setsComplete: 0 });
  }
  for (const set of setProgress) {
    const row = bySubject.get(set.subject);
    if (!row) continue;
    row.setCount += 1;
    row.questions += set.total;
    row.answered += set.answered;
    if (set.complete) row.setsComplete += 1;
  }

  const marksEarned = setProgress.reduce(
    (sum, s) => sum + s.questions.reduce((n, q) => n + (q.submissions[0]?.pointsAwarded ?? 0), 0),
    0
  );
  const setsComplete = setProgress.filter((s) => s.complete).length;
  const me = ranked.find((s) => s.id === userId);

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-sky-500 uppercase">
              {student.grade} · {subjectNames.join(" · ")}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-sky-950">Welcome back, {firstName}!</h1>
            <p className="mt-1 text-sm text-gray-600">
              {nextUp
                ? nextUp.answered > 0
                  ? `Pick up ${nextUp.title} where you left off — ${nextUp.total - nextUp.answered} card${nextUp.total - nextUp.answered === 1 ? "" : "s"} to go.`
                  : "Your next set is ready when you are."
                : "You've finished every set available. Nicely done!"}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href={nextUp ? `/dashboard/sets/${nextUp.id}` : "/dashboard/sets"}
                className="rounded-xl bg-sky-600 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-sky-700 active:scale-[0.98]"
              >
                {nextUp && nextUp.answered > 0 ? "Continue journey →" : "Start your journey →"}
              </Link>
              <Link
                href="/dashboard/sets"
                className="rounded-xl border border-sky-200 bg-white px-4 py-2.5 font-medium text-sky-700 hover:bg-sky-50"
              >
                All sets
              </Link>
            </div>
          </div>

          {/* Wrapper carries the responsive visibility: CelebratingCat sets its
              own display class, which would otherwise win over ours. */}
          <div className="hidden shrink-0 sm:block">
            <CelebratingCat size="h-24 w-24" sparkleSize="text-lg" />
          </div>
        </div>
      </section>

      <CheckInCard state={checkIn} />

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Marks earned" value={marksEarned.toLocaleString()} />
        <Stat label="Sets finished" value={`${setsComplete} / ${setProgress.length}`} />
        <Stat
          label="Scoreboard"
          value={me ? `#${me.rank}` : "—"}
          href="/dashboard/leaderboard"
        />
        <Stat
          label="Check-in streak"
          value={`${checkIn.currentStreak} day${checkIn.currentStreak === 1 ? "" : "s"}`}
        />
      </section>

      {/* Subject tiles */}
      <section>
        <h2 className="mb-1 text-lg font-bold text-sky-950">Choose your path</h2>
        <p className="mb-4 text-sm text-gray-500">
          Hover a subject to wake it up, then tap to see its sets.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjectNames.map((name) => {
            const summary = bySubject.get(name)!;
            const theme = themeFor(name);
            const pct = summary.questions > 0 ? (summary.answered / summary.questions) * 100 : 0;
            return (
              <Link
                key={name}
                href={`/dashboard/sets?subject=${encodeURIComponent(name)}`}
                className={`subject-tile group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:-translate-y-1 focus-visible:shadow-lg ${theme.ring}`}
              >
                <div className={`h-28 ${theme.band} p-2`}>
                  <SubjectArt subject={name} />
                </div>
                <div className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`font-bold ${theme.text}`}>{name}</p>
                    <p className="text-xs text-gray-500">
                      {summary.setCount} set{summary.setCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${theme.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {summary.questions === 0
                      ? "No questions yet"
                      : `${summary.answered} / ${summary.questions} answered · ${summary.setsComplete} set${summary.setsComplete === 1 ? "" : "s"} done`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Quick links */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/leaderboard"
          className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100"
        >
          <span className="text-2xl">🏆</span>
          <span>
            <span className="block font-semibold text-amber-900">Scoreboard</span>
            <span className="block text-xs text-amber-700">
              See where you stand in the top 10
            </span>
          </span>
        </Link>
        <Link
          href="/dashboard/catalogue"
          className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 transition-colors hover:bg-rose-100"
        >
          <span className="text-2xl">🎁</span>
          <span>
            <span className="block font-semibold text-rose-900">Rewards catalogue</span>
            <span className="block text-xs text-rose-700">Spend your marks on gifts</span>
          </span>
        </Link>
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const inner = (
    <>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-sky-900">{value}</p>
    </>
  );
  const className = "rounded-2xl border border-gray-200 bg-white p-4";
  return href ? (
    <Link href={href} className={`${className} transition-colors hover:bg-sky-50`}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}
