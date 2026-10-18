import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function PaymentStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; deleted?: string; grade?: string }>;
}) {
  const { q = "", deleted, grade = "" } = await searchParams;
  const term = q.trim().toLowerCase();

  const [students, grades] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        name: true,
        email: true,
        grade: true,
        suspendedAt: true,
        subjects: { select: { subject: true }, orderBy: { subject: "asc" } },
      },
    }),
    prisma.grade.findMany({ orderBy: { order: "asc" }, select: { name: true } }),
  ]);
  const rows = students
    .filter((s) => !term || s.name.toLowerCase().includes(term) || s.email.includes(term))
    .filter((s) => !grade || s.grade === grade)
    .sort((a, b) => (a.grade ?? "~").localeCompare(b.grade ?? "~") || a.name.localeCompare(b.name));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Students</h1>
          <p className="text-sm text-gray-600">
            Exercise portal accounts. Their portal subjects are changed on the portal; a receipt has its own.
          </p>
        </div>
        <Link
          href="/payment/students/new"
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          + Add student
        </Link>
      </div>

      {deleted && (
        <p className="mb-4 rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">
          Student account deleted. Receipts already sent are kept.
        </p>
      )}

      <form className="mb-3 flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name or email"
          aria-label="Search students"
          className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
        />
        <select name="grade" defaultValue={grade} aria-label="Grade" className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm">
          <option value="">All grades</option>
          {grades.map((g) => (
            <option key={g.name}>{g.name}</option>
          ))}
        </select>
        <button className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">Filter</button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-100 text-left text-xs text-stone-600">
            <tr>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Grade</th>
              <th className="px-3 py-2">Portal subjects</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((s) => {
              const subjects = s.subjects.map((x) => x.subject);
              return (
                <tr key={s.id} className="hover:bg-stone-50">
                  <td className="px-3 py-2">
                    <Link href={`/payment/students/${s.id}`} className="font-medium text-teal-800 hover:underline">
                      {s.name}
                    </Link>
                    {s.suspendedAt && (
                      <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">Suspended</span>
                    )}
                    <span className="block text-xs text-gray-500">{s.email}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{s.grade ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{subjects.join(", ") || "—"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-gray-500">
                  No students match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
