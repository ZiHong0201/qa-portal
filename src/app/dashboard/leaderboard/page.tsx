import { auth } from "@/auth";
import { getRankedStudents, type RankedStudent } from "@/lib/leaderboard";
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

// Green at 80%+, amber in the middle, rose below half - so a teacher can scan
// the column without reading every number.
function accuracyColor(accuracy: number) {
  if (accuracy >= 80) return "text-emerald-600";
  if (accuracy >= 50) return "text-amber-600";
  return "text-rose-500";
}

function Accuracy({ student }: { student: RankedStudent }) {
  if (student.accuracy === null) {
    return <span className="block text-xs text-gray-400">not marked yet</span>;
  }
  return (
    <span
      className={`block text-xs font-medium ${accuracyColor(student.accuracy)}`}
      title={`${student.correct} of ${student.graded} answers correct`}
    >
      {student.accuracy}% correct
    </span>
  );
}

export default async function LeaderboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const ranked = await getRankedStudents();
  // Filter by rank, not by position, so students tied for 10th all stay on
  // the board rather than one of them being cut off arbitrarily.
  const top10 = ranked.filter((s) => s.rank <= 10);
  const me = ranked.find((s) => s.id === userId);
  const meInTop10 = !!me && me.rank <= 10;
  const tenthPlacePoints = top10[top10.length - 1]?.points ?? 0;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-sky-950">Scoreboard</h1>
      <p className="mb-6 text-sm text-gray-500">
        Top 10 students by marks earned, with the share of answers each one got right.
        Redeeming gifts won&apos;t lower your score.
      </p>

      {top10.length === 0 ? (
        <div className="rounded-xl border border-sky-100 bg-white p-8 text-center">
          <p className="font-medium text-gray-700">No scores yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Answer some questions and you&apos;ll be the first on the board.
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

                <span className="shrink-0 text-right">
                  <span className="block">
                    <span className="text-lg font-bold text-sky-700">
                      {student.points.toLocaleString()}
                    </span>
                    <span className="ml-1 text-xs text-gray-500">pts</span>
                  </span>
                  <Accuracy student={student} />
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {me && !meInTop10 && (
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
              {(tenthPlacePoints - me.points).toLocaleString()} pts behind 10th place
            </p>
          </div>
          <span className="shrink-0 text-right">
            <span className="block">
              <span className="text-lg font-bold text-sky-700">{me.points.toLocaleString()}</span>
              <span className="ml-1 text-xs text-sky-700/70">pts</span>
            </span>
            <Accuracy student={me} />
          </span>
        </div>
      )}
    </div>
  );
}
