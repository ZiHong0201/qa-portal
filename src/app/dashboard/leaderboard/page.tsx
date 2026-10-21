import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getStudentStats,
  rankStudents,
  MIN_GRADED_FOR_ACCURACY,
  type RankedStudent,
  type LeaderboardMetric,
  type LeaderboardPeriod,
} from "@/lib/leaderboard";
import { weekStartKey } from "@/lib/check-in";
import { CelebratingCat } from "@/components/celebrating-cat";
import { isStaff } from "@/lib/permissions";
import { getUiLang } from "@/lib/i18n.server";
import { dateLocale, type UiLang } from "@/lib/i18n";
import { rewardsText } from "@/lib/text/rewards";

type BoardText = (typeof rewardsText)["en"]["board"];

const MEDAL_STYLES: Record<number, string> = {
  1: "bg-amber-100 text-amber-800 ring-amber-300",
  2: "bg-slate-200 text-slate-700 ring-slate-300",
  3: "bg-orange-100 text-orange-800 ring-orange-300",
};

const ROW_STYLES: Record<number, string> = {
  1: "border-amber-200 bg-gradient-to-r from-amber-50 to-white",
  2: "border-slate-200 bg-gradient-to-r from-slate-50 to-white",
  3: "border-orange-200 bg-gradient-to-r from-orange-50 to-white",
};

// Green at 80%+, amber in the middle, rose below half - so a teacher can scan
// the column without reading every number.
function accuracyColor(accuracy: number) {
  if (accuracy >= 80) return "text-emerald-600";
  if (accuracy >= 50) return "text-amber-600";
  return "text-rose-500";
}

function boardHref(form: string | null, metric: LeaderboardMetric, period: LeaderboardPeriod) {
  const params = new URLSearchParams(form ? { form } : {});
  if (metric !== "points") params.set("by", metric);
  // The weekly board is the default, so only the all-time one needs saying.
  if (period === "all") params.set("period", "all");
  return `/dashboard/leaderboard?${params.toString()}`;
}

/** "Mon 28 Sep" - the day the current week began, for the description. */
function weekLabel(day: string, lang: UiLang) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(dateLocale(lang), {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
        active
          ? "border-sky-300 bg-sky-100 text-sky-800"
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {children}
    </Link>
  );
}

/** The headline figure for the board being shown, with the other beneath it. */
function Score({
  student,
  metric,
  period,
  t,
}: {
  student: RankedStudent;
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  t: BoardText;
}) {
  const accuracy =
    student.accuracy === null ? null : (
      <span
        className={`block text-xs font-medium ${accuracyColor(student.accuracy)}`}
        title={t.correctOf(student.correct, student.graded)}
      >
        {t.pctCorrect(student.accuracy)}
      </span>
    );

  if (metric === "streak" && period === "week") {
    return (
      <span className="shrink-0 text-right">
        <span className="block">
          <span className="text-lg font-bold text-amber-600">{student.checkInDays}</span>
          <span className="ml-1 text-xs text-gray-500">{t.ofSevenDays}</span>
        </span>
        <span className="block text-xs text-gray-500">
          {student.currentStreak > 0 ? t.onRun(student.currentStreak) : t.runBroken}
        </span>
      </span>
    );
  }

  if (metric === "streak") {
    // Whether the run is still alive is the interesting part once the best
    // figure is shown, so it gets the subtitle rather than the marks. Note a
    // streak counts as alive on the strength of yesterday's check-in - today's
    // is still there to be claimed - so the wording avoids saying "today".
    return (
      <span className="shrink-0 text-right">
        <span className="block">
          <span className="text-lg font-bold text-amber-600">{student.longestStreak}</span>
          <span className="ml-1 text-xs text-gray-500">{t.days(student.longestStreak)}</span>
        </span>
        <span className="block text-xs text-gray-500">
          {student.currentStreak === 0
            ? t.streakBroken
            : student.currentStreak === student.longestStreak
              ? t.stillGoing
              : t.nowOn(student.currentStreak)}
        </span>
      </span>
    );
  }

  if (metric === "accuracy") {
    return (
      <span className="shrink-0 text-right">
        <span
          className="block"
          title={t.correctOf(student.correct, student.graded)}
        >
          <span className={`text-lg font-bold ${accuracyColor(student.accuracy ?? 0)}`}>
            {student.accuracy}%
          </span>
          <span className="ml-1 text-xs text-gray-500">{t.correct}</span>
        </span>
        <span className="block text-xs text-gray-500">
          {t.ptsAnswered(student.points.toLocaleString(), student.graded)}
        </span>
      </span>
    );
  }

  return (
    <span className="shrink-0 text-right">
      <span className="block">
        <span className="text-lg font-bold text-sky-700">{student.points.toLocaleString()}</span>
        <span className="ml-1 text-xs text-gray-500">{t.pts}</span>
      </span>
      {accuracy ?? <span className="block text-xs text-gray-400">{t.notMarked}</span>}
    </span>
  );
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ form?: string; by?: string; period?: string }>;
}) {
  const { form: formParam, by, period: periodParam } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;
  // Staff reach this board from their own nav, and staff pages stay English.
  const lang: UiLang = isStaff(session) ? "en" : await getUiLang();
  const t = rewardsText[lang].board;

  const metric: LeaderboardMetric =
    by === "accuracy" ? "accuracy" : by === "streak" ? "streak" : "points";
  // This week by default: it is the board a student can actually move on.
  const period: LeaderboardPeriod = periodParam === "all" ? "all" : "week";
  const weekStart = weekStartKey();

  // The session carries id and role only, so the viewer's own form - which
  // decides the default board - comes from the user record.
  const [all, viewer] = await Promise.all([
    getStudentStats(period),
    prisma.user.findUnique({ where: { id: userId }, select: { grade: true } }),
  ]);
  const myGrade = viewer?.grade ?? null;

  // Only offer forms that actually have someone on the board, so the filter
  // can never lead to an empty page.
  const forms = [...new Set(all.map((s) => s.grade).filter((g): g is string => !!g))].sort();

  // Each form has its own board - there is no combined view. Default to the
  // viewer's own form, since that is the one they are competing in.
  const form =
    (formParam && forms.includes(formParam) ? formParam : null) ??
    (myGrade && forms.includes(myGrade) ? myGrade : null) ??
    forms[0] ??
    null;

  const scoped = form ? all.filter((s) => s.grade === form) : [];
  const ranked = rankStudents(scoped, metric, period);

  // Filter by rank, not by position, so students tied for 10th all stay on
  // the board rather than one of them being cut off arbitrarily.
  const top10 = ranked.filter((s) => s.rank <= 10);
  const me = ranked.find((s) => s.id === userId);
  const meInTop10 = !!me && me.rank <= 10;
  const tenth = top10[top10.length - 1];

  // Whoever is viewing has a form of their own; if they are outside the board
  // being shown it is worth saying why.
  const myStats = all.find((s) => s.id === userId);
  const excludedForAccuracy =
    metric === "accuracy" && !!myStats && myStats.graded < MIN_GRADED_FOR_ACCURACY;
  // Unlike accuracy, a student with no check-ins at all has no stats row, so
  // this covers both "never checked in" and "row exists but streak is 0".
  const excludedForStreak =
    metric === "streak" &&
    (!myStats || (period === "week" ? myStats.checkInDays : myStats.longestStreak) === 0);

  const heading = form ? t.titleForm(form) : t.title;
  const scope = period === "week" ? t.scopeWeek(weekLabel(weekStart, lang)) : t.scopeAll;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-sky-950">{heading}</h1>
      <p className="mb-4 text-sm text-gray-500">
        {metric === "points"
          ? t.descPoints(scope)
          : metric === "streak"
            ? period === "week"
              ? t.descCheckIns(scope)
              : t.descLongestStreak
            : t.descAccuracy(scope, MIN_GRADED_FOR_ACCURACY)}
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold tracking-wide text-gray-400 uppercase">{t.period}</span>
        <Chip href={boardHref(form, metric, "week")} active={period === "week"}>
          {t.thisWeek}
        </Chip>
        <Chip href={boardHref(form, metric, "all")} active={period === "all"}>
          {t.allTime}
        </Chip>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold tracking-wide text-gray-400 uppercase">{t.rankBy}</span>
        <Chip href={boardHref(form, "points", period)} active={metric === "points"}>
          {t.points}
        </Chip>
        <Chip href={boardHref(form, "accuracy", period)} active={metric === "accuracy"}>
          {t.accuracy}
        </Chip>
        <Chip href={boardHref(form, "streak", period)} active={metric === "streak"}>
          {period === "week" ? t.checkIns : t.longestStreak}
        </Chip>
      </div>

      {forms.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-gray-400 uppercase">{t.form}</span>
          {forms.map((f) => (
            <Chip key={f} href={boardHref(f, metric, period)} active={form === f}>
              {f}
            </Chip>
          ))}
        </div>
      )}

      {top10.length === 0 ? (
        <div className="rounded-xl border border-sky-100 bg-white p-8 text-center">
          <p className="font-medium text-gray-700">{t.nothingYet}</p>
          <p className="mt-1 text-sm text-gray-500">
            {metric === "accuracy"
              ? t.emptyAccuracy(MIN_GRADED_FOR_ACCURACY, period === "week")
              : metric === "streak"
                ? t.emptyStreak(period === "week")
                : period === "week"
                  ? t.emptyPointsWeek
                  : t.emptyPointsAll}
          </p>
        </div>
      ) : (
        <ol className="flex flex-col gap-2">
          {top10.map((student) => {
            const isMe = student.id === userId;
            return (
              <li
                key={student.id}
                className={`flex items-center gap-4 rounded-xl border p-4 shadow-sm ${
                  ROW_STYLES[student.rank] ?? "border-gray-200 bg-white"
                } ${isMe ? "ring-2 ring-sky-300" : ""}`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    MEDAL_STYLES[student.rank]
                      ? `${MEDAL_STYLES[student.rank]} ring-2`
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {student.rank}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">
                    {student.name}
                    {isMe && <span className="ml-2 text-xs font-normal text-sky-600">{t.you}</span>}
                  </p>
                  <p className="text-xs text-gray-500">{student.grade ?? t.noGrade}</p>
                </div>

                {/* Wrapper carries the responsive visibility: CelebratingCat sets
                    its own display class, which would otherwise win over ours. */}
                {student.rank === 1 && (
                  <div className="hidden shrink-0 sm:block">
                    <CelebratingCat />
                  </div>
                )}

                <Score student={student} metric={metric} period={period} t={t} />
              </li>
            );
          })}
        </ol>
      )}

      {me && !meInTop10 && tenth && (
        <div className="mt-4 flex items-center gap-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-sky-700">
            {me.rank}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sky-900">
              {me.name}
              <span className="ml-2 text-xs font-normal text-sky-600">{t.you}</span>
            </p>
            <p className="text-xs text-sky-700/70">
              {metric === "points"
                ? t.behindPoints((tenth.points - me.points).toLocaleString())
                : metric === "streak"
                  ? period === "week"
                    ? t.behindDays(tenth.checkInDays - me.checkInDays)
                    : t.behindDays(tenth.longestStreak - me.longestStreak)
                  : t.behindAccuracy((tenth.accuracy ?? 0) - (me.accuracy ?? 0))}
            </p>
          </div>
          <Score student={me} metric={metric} period={period} t={t} />
        </div>
      )}

      {excludedForAccuracy && (
        <p className="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
          {t.needMarked(MIN_GRADED_FOR_ACCURACY, period === "week", myStats.graded)}
        </p>
      )}

      {excludedForStreak && (
        <p className="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
          {t.checkInBefore}
          <Link href="/dashboard" className="font-medium text-sky-700 hover:underline">
            {t.homePage}
          </Link>
          {period === "week" ? t.checkInAfterWeek : t.checkInAfterAll}
        </p>
      )}
    </div>
  );
}
