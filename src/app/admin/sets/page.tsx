import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SetsBrowser } from "./sets-browser";

export default async function AdminSetsPage() {
  const sets = await prisma.questionSet.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { questions: true } },
      questions: { select: { _count: { select: { submissions: true } } } },
      grades: true,
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
      {sets.length === 0 ? (
        <p className="text-gray-500">No question sets yet.</p>
      ) : (
        <SetsBrowser sets={sets} />
      )}
    </div>
  );
}
