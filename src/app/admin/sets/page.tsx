import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deleteQuestionSet, toggleQuestionSetActive } from "@/lib/actions/questionSets";
import { SubmitButton } from "@/components/submit-button";

export default async function AdminSetsPage() {
  const sets = await prisma.questionSet.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { questions: true } },
      questions: { select: { _count: { select: { submissions: true } } } },
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Question sets</h1>
        <Link
          href="/admin/sets/new"
          className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          + New set
        </Link>
      </div>
      <ul className="flex flex-col gap-3">
        {sets.map((set) => {
          const submissionCount = set.questions.reduce((n, q) => n + q._count.submissions, 0);
          return (
          <li key={set.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link href={`/admin/sets/${set.id}`} className="font-medium hover:underline">
                  {set.title}
                </Link>
                <p className="text-sm text-gray-500">
                  {set.grade} · {set.subject} · {set._count.questions} question
                  {set._count.questions === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-sm">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    set.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {set.isActive ? "Active" : "Inactive"}
                </span>
                <Link href={`/admin/sets/${set.id}/edit`} className="text-blue-600 hover:underline">
                  Edit
                </Link>
                <form action={toggleQuestionSetActive.bind(null, set.id, !set.isActive)}>
                  <SubmitButton pendingText="..." className="text-blue-600 hover:underline">
                    {set.isActive ? "Deactivate" : "Activate"}
                  </SubmitButton>
                </form>
                {submissionCount === 0 && (
                  <form action={deleteQuestionSet.bind(null, set.id)}>
                    <SubmitButton pendingText="Deleting…" className="text-red-600 hover:underline">
                      Delete
                    </SubmitButton>
                  </form>
                )}
              </div>
            </div>
          </li>
          );
        })}
        {sets.length === 0 && <p className="text-gray-500">No question sets yet.</p>}
      </ul>
    </div>
  );
}
