import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  type BillStatus,
  STATUS_LABEL,
  STATUS_STYLE,
  isMonthKey,
  monthKey,
  monthLabel,
  rm,
  shiftMonth,
} from "@/lib/fees";
import { getBills } from "@/lib/fees.server";
import { CreateMonthBillsButton } from "./forms";

const FILTERS: { key: BillStatus | "ALL" | "OWING"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "OWING", label: "Still owing" },
  { key: "UNPAID", label: "Unpaid" },
  { key: "PARTIAL", label: "Part paid" },
  { key: "PAID", label: "Paid" },
];

export default async function MonthlyBillsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; status?: string; grade?: string }>;
}) {
  const params = await searchParams;
  const month = isMonthKey(params.month) ? params.month : monthKey();
  const status = FILTERS.some((f) => f.key === params.status) ? params.status! : "ALL";
  const grade = params.grade || "";

  const [bills, students, grades] = await Promise.all([
    getBills({ month }),
    prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, name: true, grade: true },
      orderBy: { name: "asc" },
    }),
    prisma.grade.findMany({ orderBy: { order: "asc" }, select: { name: true } }),
  ]);

  const billed = new Set(bills.map((b) => b.studentId));
  const unbilled = students.filter((s) => !billed.has(s.id));

  const totals = bills.reduce(
    (t, b) => ({ billed: t.billed + b.totalSen, paid: t.paid + b.paidSen, owing: t.owing + Math.max(0, b.balanceSen) }),
    { billed: 0, paid: 0, owing: 0 }
  );
  const owingCount = bills.filter((b) => b.status !== "PAID").length;

  // By grade, then name - the order a class's fees are chased in.
  const shown = bills
    .filter((b) => (status === "ALL" ? true : status === "OWING" ? b.status !== "PAID" : b.status === status))
    .filter((b) => !grade || b.grade === grade)
    .sort((a, b) => (a.grade ?? "~").localeCompare(b.grade ?? "~") || a.studentName.localeCompare(b.studentName));

  const href = (over: Record<string, string>) => {
    const q = new URLSearchParams({ month, status, grade, ...over });
    for (const [k, v] of [...q.entries()]) if (!v || v === "ALL") q.delete(k);
    return `/payment?${q}`;
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={href({ month: shiftMonth(month, -1) })} className="rounded-md border border-gray-300 bg-white px-2.5 py-1 hover:bg-gray-50" aria-label="Previous month">
            &larr;
          </Link>
          <h1 className="min-w-44 text-center text-2xl font-bold text-stone-900">{monthLabel(month)}</h1>
          <Link href={href({ month: shiftMonth(month, 1) })} className="rounded-md border border-gray-300 bg-white px-2.5 py-1 hover:bg-gray-50" aria-label="Next month">
            &rarr;
          </Link>
          {month !== monthKey() && (
            <Link href={href({ month: monthKey() })} className="text-sm text-teal-700 hover:underline">
              This month
            </Link>
          )}
        </div>
        <CreateMonthBillsButton month={month} label={monthLabel(month)} missing={unbilled.length} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Billed" value={rm(totals.billed)} />
        <Stat label="Collected" value={rm(totals.paid)} tone="text-teal-700" />
        <Stat label="Outstanding" value={rm(totals.owing)} tone={totals.owing ? "text-rose-700" : undefined} />
        <Stat label="Students still owing" value={`${owingCount} of ${bills.length}`} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={href({ status: f.key })}
            className={`rounded-full border px-3 py-1 text-sm ${
              status === f.key ? "border-teal-600 bg-teal-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </Link>
        ))}
        <span className="mx-1 h-5 w-px bg-gray-300" />
        <Link
          href={href({ grade: "" })}
          className={`rounded-full border px-3 py-1 text-sm ${!grade ? "border-stone-700 bg-stone-700 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
        >
          All grades
        </Link>
        {grades.map((g) => (
          <Link
            key={g.name}
            href={href({ grade: g.name })}
            className={`rounded-full border px-3 py-1 text-sm ${grade === g.name ? "border-stone-700 bg-stone-700 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
          >
            {g.name}
          </Link>
        ))}
      </div>

      {bills.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
          No bills for {monthLabel(month)} yet. Set each subject&apos;s monthly fee under{" "}
          <Link href="/payment/fees" className="text-teal-700 underline">
            Fees
          </Link>
          , then press &ldquo;Create {monthLabel(month)} bills&rdquo;.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-100 text-left text-xs text-stone-600">
              <tr>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Grade</th>
                <th className="px-3 py-2">Subjects</th>
                <th className="px-3 py-2 text-right">Bill</th>
                <th className="px-3 py-2 text-right">Paid</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shown.map((b) => (
                <tr key={b.id} className="hover:bg-stone-50">
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/payment/students/${b.studentId}`} className="text-teal-800 hover:underline">
                      {b.studentName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{b.grade ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{b.lines.map((l) => l.subject).join(", ")}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{rm(b.totalSen)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-teal-700">{rm(b.paidSen)}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">{rm(b.balanceSen)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status]}`}>
                      {STATUS_LABEL[b.status]}
                    </span>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-gray-500">
                    No bills match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {unbilled.length > 0 && bills.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-stone-700">
            {unbilled.length} student(s) with no bill for {monthLabel(month)}
          </summary>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {unbilled.map((s) => (
              <Link key={s.id} href={`/payment/students/${s.id}`} className="text-teal-800 hover:underline">
                {s.name}
                {s.grade && <span className="text-gray-400"> ({s.grade})</span>}
              </Link>
            ))}
          </p>
        </details>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-semibold tabular-nums ${tone ?? "text-stone-900"}`}>{value}</p>
    </div>
  );
}
