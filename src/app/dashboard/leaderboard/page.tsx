import Link from "next/link";
import { auth } from "@/auth";
import {
  getStudentStats,
  rankStudents,
  MIN_GRADED_FOR_ACCURACY,
  type RankedStudent,
  type LeaderboardMetric,
} from "@/lib/leaderboard";
import { CelebratingCat } from "@/components/celebrating-cat";

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

const ALL_FORMS = "all";

// Green at 80%+, amber in the middle, rose below half - so a teacher can scan
// the column without reading every number.
function accuracyColor(accuracy: number) {
  if (accuracy >= 80) return "text-emerald-600";
  if (accuracy >= 50) return "text-amber-600";
  return "text-rose-500";
}

function boardHref(form: string, metric: LeaderboardMetric) {
  const params = new URLSearchParams();
  if (form !== ALL_FORMS) params.set("form", form);
  if (metric !== "points") params.set("by", metric);
  const qs = params.toString();
  return `/dashboard/leaderboard${qs ? `?${qs}` : ""}`;
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
function Score({ student, metric }: { student: RankedStudent; metric: LeaderboardMetric }) {
  const accuracy =
    student.accuracy === null ? null : (
      <span
        className={`block text-xs font-medium ${accuracyColor(student.accuracy)}`}
        title={`${student.correct} of ${student.graded} answers correct`}
      >
        {student.accuracy}% correct
      </span>
    );

  if (metric === "accuracy") {
    return (
      <span className="shrink-0 text-right">
        <span
          className="block"
          title={`${student.correct} of ${student.graded} answers correct`}
        >
          <span className={`text-lg font-bold ${accuracyColor(student.accuracy ?? 0)}`}>
            {student.accuracy}%
          </span>
          <span className="ml-1 text-xs text-gray-500">correct</span>
        </span>
        <span className="block text-xs text-gray-500">
          {student.points.toLocaleString()} pts · {student.graded} answered
        </span>
      </span>
    );
  }

  return (
    <span className="shrink-0 text-right">
      <span className="block">
        <span className="text-lg font-bold text-sky-700">{student.points.toLocaleString()}</span>
        <span className="ml-1 text-xs text-gray-500">pts</span>
      </span>
      {accuracy ?? <span className="block text-xs text-gray-400">not marked yet</span>}
    </span>
  );
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ form?: string; by?: string }>;
}) {
  const { form: formParam, by } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const metric: LeaderboardMetric = by === "accuracy" ? "accuracy" : "points";

  const all = await getStudentStats();

  // Only offer forms that actually have someone on the board, so the filter
  // can never lead to an empty page.
  const forms = [...new Set(all.map((s) => s.grade).filter((g): g is string => !!g))].sort();
  const form = formParam && forms.includes(formParam) ? formParam : ALL_FORMS;

  const scoped = form === ALL_FORMS ? all : all.filter((s) => s.grade === form);
  const ranked = rankStudents(scoped, metric);

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

  const heading = form === ALL_FORMS ? "Scoreboard" : `Scoreboard · ${form}`;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-sky-950">{heading}</h1>
      <p className="mb-4 text-sm text-gray-500">
        {metric === "points"
          ? "Top 10 by marks earned. Equal marks are separated by accuracy."
          : `Top 10 by share of answers correct, among students with at least ${MIN_GRADED_FOR_ACCURACY} marked answers.`}
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold tracking-wide text-gray-400 uppercase">Rank by</span>
        <Chip href={boardHref(form, "points")} active={metric === "points"}>
          Points
        </Chip>
        <Chip href={boardHref(form, "accuracy")} active={metric === "accuracy"}>
          Accuracy
        </Chip>
      </div>

      {forms.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-gray-400 uppercase">Form</span>
          <Chip href={boardHref(ALL_FORMS, metric)} active={form === ALL_FORMS}>
            All forms
          </Chip>
          {forms.map((f) => (
            <Chip key={f} href={boardHref(f, metric)} active={form === f}>
              {f}
            </Chip>
          ))}
        </div>
      )}

      {top10.length === 0 ? (
        <div className="rounded-xl border border-sky-100 bg-white p-8 text-center">
          <p className="font-medium text-gray-700">Nothing to show yet</p>
          <p className="mt-1 text-sm text-gray-500">
            {metric === "accuracy"
              ? `No one here has ${MIN_GRADED_FOR_ACCURACY} marked answers yet.`
              : "Answer some questions and you'll be the first on the board."}
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
                    {isMe && <span className="ml-2 text-xs font-normal text-sky-600">You</span>}
                  </p>
                  <p className="text-xs text-gray-500">{student.grade ?? "No grade"}</p>
                </div>

                {/* Wrapper carries the responsive visibility: CelebratingCat sets
                    its own display class, which would otherwise win over ours. */}
                {student.rank === 1 && (
                  <div className="hidden shrink-0 sm:block">
                    <CelebratingCat />
                  </div>
                )}

                <Score student={student} metric={metric} />
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
              <span className="ml-2 text-xs font-normal text-sky-600">You</span>
            </p>
            <p className="text-xs text-sky-700/70">
              {metric === "points"
                ? `${(tenth.points - me.points).toLocaleString()} pts behind 10th place`
                : `${(tenth.accuracy ?? 0) - (me.accuracy ?? 0)}% behind 10th place`}
            </p>
          </div>
          <Score student={me} metric={metric} />
        </div>
      )}

      {excludedForAccuracy && (
        <p className="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
          You need {MIN_GRADED_FOR_ACCURACY} marked answers to appear on the accuracy board - you
          have {myStats.graded}. Keep going!
        </p>
      )}
    </div>
  );
}
