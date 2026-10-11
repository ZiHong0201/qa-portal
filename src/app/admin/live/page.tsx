import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LIVE_RETENTION_DAYS, phaseOf } from "@/lib/live";
import { NewLiveQuizForm } from "./new-live-quiz-form";

const PHASE_LABEL = {
  LOBBY: "Waiting for players",
  PRE: "In progress",
  QUESTION: "In progress",
  REVEAL: "In progress",
  FINISHED: "Finished",
} as const;

export default async function LiveQuizzesPage() {
  const [sets, games] = await Promise.all([
    prisma.questionSet.findMany({
      where: { isActive: true },
      orderBy: [{ subject: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        subject: true,
        _count: { select: { questions: { where: { isActive: true, type: "MULTIPLE_CHOICE" } } } },
      },
    }),
    prisma.liveQuiz.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        questionIds: true,
        _count: { select: { participants: { where: { removed: false } } } },
      },
    }),
  ]);

  const playable = sets
    .filter((s) => s._count.questions > 0)
    .map((s) => ({ id: s.id, title: s.title, subject: s.subject, count: s._count.questions }));
  // A server component renders once per request, so "now" is simply the request time.
  const now = new Date().getTime();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold">Live quiz</h1>
      <p className="mb-6 max-w-2xl text-sm text-gray-600">
        Run a question set as a game for a room. Players scan a QR code, type a name and play on
        their phones - no account needed. Scores here are separate from the portal&apos;s points
        and scoreboard. Only multiple-choice questions are used.
      </p>

      <section className="mb-10 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 font-semibold">New game</h2>
        <NewLiveQuizForm sets={playable} />
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Recent games</h2>
        {games.length === 0 ? (
          <p className="text-sm text-gray-500">No games yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
            {games.map((g) => {
              const phase = phaseOf(g, now);
              return (
                <li key={g.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/live/${g.id}`} className="font-medium hover:underline">
                      {g.title}
                    </Link>
                    <p className="text-xs text-gray-500">
                      Code {g.code} · {(JSON.parse(g.questionIds) as string[]).length} questions ·{" "}
                      {g._count.participants} players ·{" "}
                      {g.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      phase === "FINISHED" ? "bg-gray-100 text-gray-600" : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {PHASE_LABEL[phase]}
                  </span>
                  <Link
                    href={`/admin/live/${g.id}`}
                    className="text-sm font-medium text-sky-700 hover:underline"
                  >
                    {phase === "FINISHED" ? "Results" : "Open host screen"}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-xs text-gray-400">
          Games and the names players typed are deleted {LIVE_RETENTION_DAYS} days after they were
          created.
        </p>
      </section>
    </div>
  );
}
