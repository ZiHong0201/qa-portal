import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CHOICE_STYLES, withRanks } from "@/lib/live";

/**
 * Every player against every question: what each person chose, whether it
 * was right, and their total - for the host after (or during) a game.
 *
 * Read from the database rather than the live state, so it is complete:
 * the state players poll carries only what a phone needs, and this page is
 * where the whole picture lives, including who never answered what.
 */
export default async function LiveResultsPage({ params }: PageProps<"/admin/live/[id]/results">) {
  const { id } = await params;
  const quiz = await prisma.liveQuiz.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      code: true,
      status: true,
      questionIds: true,
      createdAt: true,
    },
  });
  if (!quiz) notFound();

  const ids = JSON.parse(quiz.questionIds) as string[];
  const [players, answers, questions] = await Promise.all([
    prisma.liveParticipant.findMany({
      where: { quizId: id, removed: false },
      orderBy: [{ score: "desc" }, { joinedAt: "asc" }],
      select: { id: true, name: true, score: true },
    }),
    prisma.liveAnswer.findMany({
      where: { quizId: id, participant: { removed: false } },
      select: {
        participantId: true,
        questionIndex: true,
        choiceId: true,
        correct: true,
        points: true,
      },
    }),
    prisma.question.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        body: true,
        choices: {
          orderBy: { order: "asc" },
          select: { id: true, text: true, isCorrect: true },
        },
      },
    }),
  ]);

  // In play order, which is the order of the stored ids - not the database's.
  const byId = new Map(questions.map((q) => [q.id, q]));
  const played = ids.map((qid) => byId.get(qid) ?? null);
  const letterOf = new Map<string, number>();
  for (const q of questions) q.choices.forEach((c, i) => letterOf.set(c.id, i));

  const answerOf = new Map(answers.map((a) => [`${a.participantId}:${a.questionIndex}`, a]));
  const ranked = withRanks(players);
  const correctCount = (pid: string) =>
    ids.reduce((n, _, i) => n + (answerOf.get(`${pid}:${i}`)?.correct ? 1 : 0), 0);

  const perQuestion = ids.map((_, i) => {
    const these = answers.filter((a) => a.questionIndex === i);
    return {
      answered: these.length,
      correct: these.filter((a) => a.correct).length,
    };
  });
  const average = players.length
    ? Math.round(players.reduce((t, p) => t + p.score, 0) / players.length)
    : 0;

  return (
    <div>
      <Link href="/admin/live" className="text-sm text-sky-700 hover:underline">
        ← Live quizzes
      </Link>
      <div className="mt-1 mb-1 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">{quiz.title}: results</h1>
        <Link href={`/admin/live/${id}`} className="text-sm text-sky-700 hover:underline">
          Host screen
        </Link>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        Code {quiz.code} ·{" "}
        {quiz.createdAt.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}{" "}
        · {players.length} players · {ids.length} questions · average score{" "}
        {average.toLocaleString()}
        {quiz.status !== "FINISHED" && " · game still in progress"}
      </p>

      {players.length === 0 ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
          Nobody played this game.
        </p>
      ) : (
        // Wide on purpose - one column per question - so it scrolls sideways
        // inside its own box rather than widening the page.
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left">#</th>
                <th className="sticky left-8 bg-gray-50 px-3 py-2 text-left">Player</th>
                <th className="px-3 py-2 text-right">Score</th>
                <th className="px-3 py-2 text-right">Correct</th>
                {played.map((q, i) => {
                  const right = q?.choices.findIndex((c) => c.isCorrect) ?? -1;
                  return (
                    <th
                      key={i}
                      className="px-1.5 py-2 text-center font-medium"
                      title={q ? stemOf(q.body) : ""}
                    >
                      Q{i + 1}
                      <span className="block text-[10px] text-emerald-600">
                        {right >= 0 ? CHOICE_STYLES[right % CHOICE_STYLES.length].letter : "?"}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ranked.map((p) => (
                <tr key={p.id}>
                  <td className="sticky left-0 bg-white px-3 py-1.5 text-gray-400 tabular-nums">
                    {p.rank}
                  </td>
                  <td className="sticky left-8 max-w-[12rem] truncate bg-white px-3 py-1.5 font-medium">
                    {p.name}
                  </td>
                  <td className="px-3 py-1.5 text-right font-semibold tabular-nums">
                    {p.score.toLocaleString()}
                  </td>
                  <td className="px-3 py-1.5 text-right text-gray-600 tabular-nums">
                    {correctCount(p.id)}/{ids.length}
                  </td>
                  {ids.map((_, i) => {
                    const a = answerOf.get(`${p.id}:${i}`);
                    if (!a) {
                      return (
                        <td
                          key={i}
                          className="px-1.5 py-1.5 text-center text-gray-300"
                          title="No answer"
                        >
                          –
                        </td>
                      );
                    }
                    const n = letterOf.get(a.choiceId);
                    const letter =
                      n === undefined ? "?" : CHOICE_STYLES[n % CHOICE_STYLES.length].letter;
                    return (
                      <td key={i} className="px-1 py-1" title={`${a.points} points`}>
                        <span
                          className={`mx-auto flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${
                            a.correct
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {letter}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <td className="sticky left-0 bg-gray-50" />
                <td className="sticky left-8 bg-gray-50 px-3 py-2 font-medium" colSpan={3}>
                  Got it right
                </td>
                {perQuestion.map((q, i) => (
                  <td key={i} className="px-1 py-2 text-center tabular-nums">
                    {players.length ? Math.round((q.correct / players.length) * 100) : 0}%
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <h2 className="mt-8 mb-2 font-semibold">Questions</h2>
      <ol className="flex flex-col gap-2">
        {played.map((q, i) => {
          if (!q) {
            return (
              <li key={i} className="text-sm text-gray-400">
                Q{i + 1}: this question has since been deleted.
              </li>
            );
          }
          const right = q.choices.findIndex((c) => c.isCorrect);
          const { answered, correct } = perQuestion[i];
          return (
            <li key={i} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm">
              <p>
                <span className="font-semibold">Q{i + 1}.</span> {stemOf(q.body)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Answer:{" "}
                <span className="font-medium text-emerald-700">
                  {right >= 0
                    ? `${CHOICE_STYLES[right % CHOICE_STYLES.length].letter}. ${q.choices[right].text}`
                    : "?"}
                </span>{" "}
                · {correct} of {players.length} right · {players.length - answered} no answer
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The question itself, without a passage stacked above it, trimmed for a list. */
function stemOf(body: string, limit = 160): string {
  const stem = body.split("──────────").pop()!.replace(/\s+/g, " ").trim();
  return stem.length > limit ? `${stem.slice(0, limit).trimEnd()}…` : stem;
}
