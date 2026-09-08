import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminHome() {
  const [studentCount, setCount, questionCount, pendingCount, catalogueCount] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.questionSet.count(),
    prisma.question.count(),
    prisma.submission.count({ where: { status: "PENDING" } }),
    prisma.catalogueItem.count(),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Admin overview</h1>
      <div className="grid grid-cols-5 gap-4">
        <Link href="/admin/students">
          <StatCard label="Students" value={studentCount} />
        </Link>
        <StatCard label="Question sets" value={setCount} />
        <StatCard label="Questions" value={questionCount} />
        <Link href="/admin/review">
          <StatCard label="Pending reviews" value={pendingCount} highlight={pendingCount > 0} />
        </Link>
        <Link href="/admin/catalogue">
          <StatCard label="Catalogue items" value={catalogueCount} />
        </Link>
      </div>
      <div className="mt-8 flex gap-2">
        <Link
          href="/admin/sets/new"
          className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          + New question set
        </Link>
        <Link
          href="/admin/students/new"
          className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
        >
          + New student
        </Link>
        <Link
          href="/admin/catalogue/new"
          className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
        >
          + New catalogue item
        </Link>
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
      className={`rounded-lg border p-4 ${
        highlight ? "border-yellow-300 bg-yellow-50" : "border-gray-200 bg-white"
      }`}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
