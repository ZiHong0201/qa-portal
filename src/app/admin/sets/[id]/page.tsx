import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deleteQuestion, toggleQuestionActive } from "@/lib/actions/questions";
import { ExplanationEditor } from "./explanation-editor";

export default async function AdminSetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ imported?: string }>;
}) {
  const { id } = await params;
  const { imported } = await searchParams;
  const set = await prisma.questionSet.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { createdAt: "asc" },
        include: {
          _count: { select: { submissions: true } },
          choices: { orderBy: { order: "asc" } },
        },
      },
    },
  });
  if (!set) notFound();

  const totalMarks = set.questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div>
          <Link href="/admin/sets" className="text-sm text-blue-600 hover:underline">
            &larr; All sets
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{set.title}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/sets/${set.id}/edit`}
            className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
          >
            Edit set
          </Link>
          <Link
            href={`/admin/sets/${set.id}/import`}
            className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
          >
            Import from exam paper
          </Link>
          <Link
            href={`/admin/sets/${set.id}/questions/new`}
            className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
          >
            + Add question
          </Link>
        </div>
      </div>
      {set.description && <p className="mb-2 text-gray-600">{set.description}</p>}
      <p className="mb-2 text-sm text-gray-500">
        {set.grade} · {set.subject} · {set.questions.length} question
        {set.questions.length === 1 ? "" : "s"} · {totalMarks} marks total
      </p>
      {set.simulationUrl && (
        <p className="mb-2 text-sm text-gray-500">
          Simulation:{" "}
          <a
            href={set.simulationUrl}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline"
          >
            {set.simulationUrl}
          </a>
        </p>
      )}
      {imported && (
        <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Imported {imported} question{imported === "1" ? "" : "s"} as inactive drafts — review
          each one (especially the marked correct answer) before activating it.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {set.questions.map((q, i) => (
          <li key={q.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                {q.diagramUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={q.diagramUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-md border border-gray-200 object-cover"
                  />
                )}
                <div>
                  <p className="text-xs font-medium text-gray-400">Question {i + 1}</p>
                  <p className="font-medium">{q.body}</p>
                  <p className="text-sm text-gray-500">
                    {q.points} marks · {q._count.submissions} submission
                    {q._count.submissions === 1 ? "" : "s"}
                  </p>
                  <p className="mb-2 text-sm text-gray-500">
                    Correct: {q.choices.find((c) => c.isCorrect)?.text ?? "—"}
                  </p>
                  {q.explanation && (
                    <p className="mb-1 text-sm text-gray-600">{q.explanation}</p>
                  )}
                  <ExplanationEditor questionId={q.id} initialExplanation={q.explanation} />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-sm">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    q.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {q.isActive ? "Active" : "Inactive"}
                </span>
                {q._count.submissions === 0 && (
                  <Link
                    href={`/admin/sets/${set.id}/questions/${q.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                )}
                <form action={toggleQuestionActive.bind(null, q.id, !q.isActive)}>
                  <button type="submit" className="text-blue-600 hover:underline">
                    {q.isActive ? "Deactivate" : "Activate"}
                  </button>
                </form>
                {q._count.submissions === 0 && (
                  <form action={deleteQuestion.bind(null, q.id)}>
                    <button type="submit" className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </form>
                )}
              </div>
            </div>
          </li>
        ))}
        {set.questions.length === 0 && (
          <p className="text-gray-500">No questions in this set yet.</p>
        )}
      </ul>
    </div>
  );
}
