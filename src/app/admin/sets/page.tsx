import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { currentEditableSubjects } from "@/lib/permissions";
import { SetsBrowser } from "./sets-browser";
import { SubjectAccessNote } from "./subject-access-note";

export default async function AdminSetsPage() {
  const [sets, editable] = await Promise.all([
    prisma.questionSet.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { questions: true } },
        questions: { select: { _count: { select: { submissions: true } } } },
        grades: true,
      },
    }),
    currentEditableSubjects(),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Question sets</h1>
        {(editable === null || editable.length > 0) && (
          <Link
            href="/admin/sets/new"
            className="rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
          >
            + New set
          </Link>
        )}
      </div>
      <SubjectAccessNote editable={editable} />
      {sets.length === 0 ? (
        <p className="text-gray-500">No question sets yet.</p>
      ) : (
        <SetsBrowser sets={sets} editable={editable} />
      )}
    </div>
  );
}
