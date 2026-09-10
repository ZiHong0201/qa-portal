import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FlashcardDeck, type FlashcardQuestion } from "./flashcard-deck";

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

  const cards: FlashcardQuestion[] = set.questions.map((q) => {
    const submission = q.submissions[0];
    return {
      id: q.id,
      body: q.body,
      diagramUrl: q.diagramUrl,
      points: q.points,
      choices: q.choices.map((c) => ({ id: c.id, text: c.text })),
      submission: submission ? { status: submission.status, pointsAwarded: submission.pointsAwarded } : null,
      correctAnswerText: submission ? (q.choices.find((c) => c.isCorrect)?.text ?? null) : null,
      explanation: submission ? q.explanation : null,
    };
  });

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50 to-white p-6 shadow-sm">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-sky-600 hover:text-sky-800 hover:underline"
      >
        &larr; All sets
      </Link>
      <h1 className="mt-2 mb-1 text-2xl font-bold text-sky-950">{set.title}</h1>
      {set.description && <p className="mb-4 text-sky-700/80">{set.description}</p>}

      {set.simulationUrl && (
        <div className="mb-6 overflow-hidden rounded-xl border border-sky-200 bg-white shadow-sm">
          <p className="border-b border-sky-100 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700">
            Related simulation
          </p>
          <iframe
            src={set.simulationUrl}
            className="w-full"
            style={{ height: 500 }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            allow="fullscreen"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}

      {complete ? (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-medium text-emerald-800">
            You&apos;ve completed this set. Marks obtained: {marksObtained} / {totalMarks}
          </p>
        </div>
      ) : (
        <p className="mb-6 inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-800">
          {answered} / {total} answered
        </p>
      )}

      {cards.length > 0 ? (
        <FlashcardDeck questions={cards} />
      ) : (
        <p className="text-sky-700/70">No questions in this set yet.</p>
      )}
    </div>
  );
}
