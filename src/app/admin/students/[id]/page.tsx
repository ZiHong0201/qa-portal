import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStudentBalance } from "@/lib/points";
import { AdjustmentForm } from "./adjustment-form";
import { DeleteStudentButton } from "./delete-student-button";
import { ClearAnswersButton } from "./clear-answers-button";

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const student = await prisma.user.findFirst({
    where: { id, role: "STUDENT" },
    include: { subjects: true },
  });
  if (!student) notFound();

  const [balance, adjustments, redemptions, submissions, answerResets] = await Promise.all([
    getStudentBalance(id),
    prisma.pointAdjustment.findMany({
      where: { studentId: id },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.redemption.findMany({
      where: { studentId: id },
      orderBy: { createdAt: "desc" },
      include: { catalogueItem: { select: { name: true } } },
    }),
    prisma.submission.findMany({
      where: { studentId: id },
      select: {
        status: true,
        pointsAwarded: true,
        createdAt: true,
        question: {
          select: {
            points: true,
            questionSet: { select: { id: true, title: true, subject: true } },
          },
        },
      },
    }),
    prisma.answerReset.findMany({
      where: { studentId: id },
      orderBy: { ranAt: "desc" },
      take: 20,
    }),
  ]);

  const setIds = Array.from(new Set(submissions.map((s) => s.question.questionSet.id)));
  const setTotals = await prisma.questionSet.findMany({
    where: { id: { in: setIds } },
    select: { id: true, _count: { select: { questions: { where: { isActive: true } } } } },
  });
  const totalQuestionsBySet = new Map(setTotals.map((s) => [s.id, s._count.questions]));

  const progressBySet = new Map<
    string,
    {
      title: string;
      subject: string;
      totalQuestions: number;
      answered: number;
      correct: number;
      marksObtained: number;
      totalMarks: number;
      lastAnsweredAt: Date;
    }
  >();
  for (const sub of submissions) {
    const set = sub.question.questionSet;
    const entry = progressBySet.get(set.id) ?? {
      title: set.title,
      subject: set.subject,
      totalQuestions: totalQuestionsBySet.get(set.id) ?? 0,
      answered: 0,
      correct: 0,
      marksObtained: 0,
      totalMarks: 0,
      lastAnsweredAt: sub.createdAt,
    };
    entry.answered += 1;
    if (sub.status === "CORRECT" || sub.status === "APPROVED") entry.correct += 1;
    entry.marksObtained += sub.pointsAwarded;
    entry.totalMarks += sub.question.points;
    if (sub.createdAt > entry.lastAnsweredAt) entry.lastAnsweredAt = sub.createdAt;
    progressBySet.set(set.id, entry);
  }
  const totalAnswered = submissions.length;
  const totalMarksEarned = submissions.reduce((sum, s) => sum + s.pointsAwarded, 0);

  const progress = Array.from(progressBySet.entries())
    .map(([setId, p]) => ({ setId, ...p }))
    .sort((a, b) => b.lastAnsweredAt.getTime() - a.lastAnsweredAt.getTime());

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/students" className="text-sm text-blue-600 hover:underline">
        &larr; All students
      </Link>
      <div className="mt-1 mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{student.name}</h1>
        <Link
          href={`/admin/students/${student.id}/edit`}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
        >
          Edit
        </Link>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        {student.email} · {student.grade ?? "No grade"} ·{" "}
        {student.subjects.length > 0
          ? student.subjects.map((s) => s.subject).join(", ")
          : "No subjects"}
      </p>

      <div className="mb-6 grid grid-cols-5 gap-3">
        <StatCard label="Earned" value={balance.earned} />
        <StatCard label="Check-in bonus" value={balance.checkInBonus} />
        <StatCard label="Adjustments" value={balance.adjustments} />
        <StatCard label="Redeemed" value={-balance.redeemed} />
        <StatCard label="Balance" value={balance.balance} highlight />
      </div>

      <div className="mb-8">
        <h2 className="mb-3 font-medium">Question set progress</h2>
        <ul className="flex flex-col gap-2">
          {progress.map((p) => (
            <li
              key={p.setId}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <Link href={`/admin/sets/${p.setId}`} className="font-medium hover:underline">
                  {p.title}
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{p.subject}</span>
                  <ClearAnswersButton
                    studentId={student.id}
                    studentName={student.name}
                    questionSetId={p.setId}
                    setTitle={p.title}
                    answered={p.answered}
                    marks={p.marksObtained}
                    balance={balance.balance}
                    label="Reset paper"
                  />
                </div>
              </div>
              <div className="mt-1 flex items-center gap-4 text-xs text-gray-600">
                <span>
                  {p.answered} / {p.totalQuestions} answered
                </span>
                <span className="text-green-700">{p.correct} correct</span>
                <span>
                  {p.marksObtained} / {p.totalMarks} marks
                </span>
                <span className="text-gray-400">
                  Last answered {p.lastAnsweredAt.toLocaleDateString()}
                </span>
              </div>
            </li>
          ))}
          {progress.length === 0 && (
            <p className="text-sm text-gray-500">Hasn&apos;t started any question set yet.</p>
          )}
        </ul>
      </div>

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-medium">Adjust points</h2>
        <AdjustmentForm studentId={id} />
      </div>

      <div className="mb-8">
        <h2 className="mb-3 font-medium">Adjustment history</h2>
        <ul className="flex flex-col gap-2">
          {adjustments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <div>
                <span className={a.amount >= 0 ? "text-green-700" : "text-red-700"}>
                  {a.amount >= 0 ? "+" : ""}
                  {a.amount} pts
                </span>
                {a.reason && <span className="ml-2 text-gray-500">{a.reason}</span>}
              </div>
              <span className="text-xs text-gray-400">
                {a.createdBy.name} · {a.createdAt.toLocaleDateString()}
              </span>
            </li>
          ))}
          {adjustments.length === 0 && (
            <p className="text-sm text-gray-500">No manual adjustments yet.</p>
          )}
        </ul>
      </div>

      {answerResets.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 font-medium">Cleared for redo</h2>
          <ul className="flex flex-col gap-2">
            {answerResets.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <div>
                  <span>{r.questionSetTitle ?? "All question sets"}</span>
                  <span className="ml-2 text-gray-500">
                    {r.answersCleared} answer{r.answersCleared === 1 ? "" : "s"}, -
                    {r.marksWithdrawn} marks
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {r.clearedByName ?? "Unknown"} · {r.ranAt.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="mb-3 font-medium">Redemption history</h2>
        <ul className="flex flex-col gap-2">
          {redemptions.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <span>{r.catalogueItem.name}</span>
              <span className="text-xs text-gray-400">
                -{r.cost} pts · {r.createdAt.toLocaleDateString()}
              </span>
            </li>
          ))}
          {redemptions.length === 0 && (
            <p className="text-sm text-gray-500">No redemptions yet.</p>
          )}
        </ul>
      </div>

      {progress.length > 0 && (
        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-1 font-medium text-amber-900">Reset every paper</h2>
          <p className="mb-3 text-sm text-amber-800">
            Clears every answer {student.name} has given, across all {progress.length} set
            {progress.length === 1 ? "" : "s"}, so the whole lot can be redone. The{" "}
            {totalMarksEarned} mark{totalMarksEarned === 1 ? "" : "s"} those answers earned are
            taken back, and earned again by redoing the work. The account, points adjustments and
            rewards are untouched.
          </p>
          <ClearAnswersButton
            studentId={student.id}
            studentName={student.name}
            answered={totalAnswered}
            marks={totalMarksEarned}
            balance={balance.balance}
            label="Reset every paper"
            className="rounded-md border border-amber-400 bg-white px-4 py-2 text-sm text-amber-800 hover:bg-amber-100 disabled:opacity-50"
          />
        </div>
      )}

      <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4">
        <h2 className="mb-1 font-medium text-red-800">Danger zone</h2>
        <p className="mb-3 text-sm text-red-700">
          Permanently deletes this student&apos;s account, login, answer history, and points.
        </p>
        <DeleteStudentButton studentId={student.id} studentName={student.name} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight ? "border-black bg-gray-50" : "border-gray-200 bg-white"
      }`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
