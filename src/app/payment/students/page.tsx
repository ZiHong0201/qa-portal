import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { rm } from "@/lib/fees";
import { monthlyLinesFor, outstandingByStudent } from "@/lib/fees.server";

export default async function PaymentStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; owing?: string }>;
}) {
  const { q = "", owing } = await searchParams;
  const term = q.trim().toLowerCase();

  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true, grade: true, suspendedAt: true },
  });
  const [owed, lines] = await Promise.all([outstandingByStudent(), monthlyLinesFor(students.map((s) => s.id))]);

  const rows = students
    .filter((s) => !term || s.name.toLowerCase().includes(term))
    .filter((s) => !owing || (owed.get(s.id) ?? 0) > 0)
    .sort((a, b) => (a.grade ?? "~").localeCompare(b.grade ?? "~") || a.name.localeCompare(b.name));
  const totalOwed = [...owed.values()].reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Students</h1>
          <p className="text-sm text-gray-600">
            {owed.size} student(s) owe {rm(totalOwed)} in total, across all months.
          </p>
        </div>
        <form className="flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name"
            aria-label="Search by name"
            className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
          />
          <label className="flex items-center gap-1.5 text-sm text-gray-700">
            <input type="checkbox" name="owing" value="1" defaultChecked={!!owing} />
            Owing only
          </label>
          <button className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">
            Filter
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-100 text-left text-xs text-stone-600">
            <tr>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Grade</th>
              <th className="px-3 py-2">Monthly fee</th>
              <th className="px-3 py-2 text-right">Owing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((s) => {
              const monthly = lines.get(s.id)!;
              const owes = owed.get(s.id) ?? 0;
              return (
                <tr key={s.id} className="hover:bg-stone-50">
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/payment/students/${s.id}`} className="text-teal-800 hover:underline">
                      {s.name}
                    </Link>
                    {s.suspendedAt && (
                      <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">Suspended</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{s.grade ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {monthly.length ? (
                      <>
                        {rm(monthly.reduce((t, l) => t + l.amountSen, 0))}
                        <span className="text-gray-400"> · {monthly.map((l) => l.subject).join(", ")}</span>
                      </>
                    ) : (
                      <span className="text-gray-400">No fee set</span>
                    )}
                  </td>
                  <td className={`px-3 py-2 text-right font-medium tabular-nums ${owes ? "text-rose-700" : "text-gray-400"}`}>
                    {owes ? rm(owes) : "—"}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-gray-500">
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
