import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CelebratingCat } from "@/components/celebrating-cat";

// Ranked on marks earned from answering questions, not on the spendable
// balance shown in the nav - otherwise redeeming a gift would knock a
// student down the board for doing exactly what the points are for.
async function getRankedStudents() {
  const [earnedRows, students] = await Promise.all([
    prisma.submission.groupBy({
      by: ["studentId"],
      where: { status: { in: ["CORRECT", "APPROVED"] } },
      _sum: { pointsAwarded: true },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, name: true, grade: true },
    }),
  ]);

  const earnedById = new Map(earnedRows.map((r) => [r.studentId, r._sum.pointsAwarded ?? 0]));

  const sorted = students
    .map((s) => ({ ...s, points: earnedById.get(s.id) ?? 0 }))
    .filter((s) => s.points > 0)
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  // Standard competition ranking, so tied students share a place (1, 2, 2, 4).
  let previousPoints: number | null = null;
  let previousRank = 0;
  return sorted.map((s, i) => {
    const rank = s.points === previousPoints ? previousRank : i + 1;
    previousPoints = s.points;
    previousRank = rank;
    return { ...s, rank };
  });
}

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
        Top 10 students by marks earned. Redeeming gifts won&apos;t lower your score.
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
                  <span className="text-lg font-bold text-sky-700">
                    {student.points.toLocaleString()}
                  </span>
                  <span className="ml-1 text-xs text-gray-500">pts</span>
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
            <span className="text-lg font-bold text-sky-700">{me.points.toLocaleString()}</span>
            <span className="ml-1 text-xs text-sky-700/70">pts</span>
          </span>
        </div>
      )}
    </div>
  );
}
