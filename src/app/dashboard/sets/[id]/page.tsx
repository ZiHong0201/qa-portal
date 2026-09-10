import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AnswerForm } from "./answer-form";

const MESSAGES: Record<string, (points: number) => string> = {
  PENDING: () => "Your answer has been submitted and is awaiting teacher review.",
  CORRECT: (p) => `Correct! You earned ${p} marks.`,
  INCORRECT: () => "That wasn't correct. No marks were awarded.",
  APPROVED: (p) => `Approved! You earned ${p} marks.`,
  REJECTED: () => "Your answer wasn't approved. No marks were awarded.",
};

export default async function StudentSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const student = await prisma.user.findUnique({
    where: { id: userId },
    select: { grade: true, subjects: { select: { subject: true } } },
  });
  const subjectNames = student?.subjects.map((s) => s.subject) ?? [];

  const set = await prisma.questionSet.findUnique({
    where: { id },
    include: {
      questions: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        include: {
          choices: { orderBy: { order: "asc" } },
          submissions: { where: { studentId: userId } },
        },
      },
    },
  });
  if (
    !set ||
    !set.isActive ||
    set.grade !== student?.grade ||
    !subjectNames.includes(set.subject)
  )
    notFound();

  const total = set.questions.length;
  const answered = set.questions.filter((q) => q.submissions.length > 0).length;
  const totalMarks = set.questions.reduce((sum, q) => sum + q.points, 0);
  const marksObtained = set.questions.reduce(
    (sum, q) => sum + (q.submissions[0]?.pointsAwarded ?? 0),
    0
  );
  const complete = total > 0 && answered === total;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
        &larr; All sets
      </Link>
      <h1 className="mt-1 mb-1 text-2xl font-bold">{set.title}</h1>
      {set.description && <p className="mb-4 text-gray-600">{set.description}</p>}

      {set.simulationUrl && (
        <div className="mb-6">
          <p className="mb-2 text-sm font-medium text-gray-700">Related simulation</p>
          <iframe
            src={set.simulationUrl}
            className="w-full rounded-lg border border-gray-200"
            style={{ height: 500 }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            allow="fullscreen"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}

      {complete ? (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="font-medium text-green-800">
            You&apos;ve completed this set. Marks obtained: {marksObtained} / {totalMarks}
          </p>
        </div>
      ) : (
        <p className="mb-6 text-sm text-gray-500">
          {answered} / {total} answered
        </p>
      )}

      <ul className="flex flex-col gap-4">
        {set.questions.map((q, i) => {
          const submission = q.submissions[0];
          return (
            <li key={q.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="mb-1 text-xs font-medium text-gray-400">
                Question {i + 1} of {total} · {q.points} marks
              </p>
              <p className="mb-3 whitespace-pre-wrap font-medium">{q.body}</p>
              {q.diagramUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={q.diagramUrl}
                  alt="Diagram for this question"
                  className="mb-3 max-w-full rounded-md border border-gray-200"
                />
              )}

              {submission ? (
                <div className="rounded-md bg-gray-50 px-3 py-2">
                  <p className="text-sm font-medium">
                    {MESSAGES[submission.status](submission.pointsAwarded)}
                  </p>
                  {submission.status !== "PENDING" && (
                    <div className="mt-2 border-t border-gray-200 pt-2 text-sm text-gray-700">
                      <p>
                        <span className="font-medium">Correct answer:</span>{" "}
                        {q.choices.find((c) => c.isCorrect)?.text ?? "—"}
                      </p>
                      {q.explanation && <p className="mt-1">{q.explanation}</p>}
                    </div>
                  )}
                </div>
              ) : (
                <AnswerForm questionId={q.id} choices={q.choices} />
              )}
            </li>
          );
        })}
        {set.questions.length === 0 && (
          <p className="text-gray-500">No questions in this set yet.</p>
        )}
      </ul>
    </div>
  );
}
