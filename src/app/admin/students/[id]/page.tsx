import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStudentBalance } from "@/lib/points";
import { AdjustmentForm } from "./adjustment-form";

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const student = await prisma.user.findFirst({
    where: { id, role: "STUDENT" },
    include: { subjects: true },
  });
  if (!student) notFound();

  const [balance, adjustments, redemptions] = await Promise.all([
    getStudentBalance(id),
    prisma.pointAdjustment.findMany({
      where: { studentId: id },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.redemption.findMany({
      where: { studentId: id },
      orderBy: { createdAt: "desc" },
      include: { catalogueItem: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/students" className="text-sm text-blue-600 hover:underline">
        &larr; All students
      </Link>
      <h1 className="mt-1 mb-1 text-2xl font-bold">{student.name}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {student.email} · {student.grade ?? "No grade"} ·{" "}
        {student.subjects.length > 0
          ? student.subjects.map((s) => s.subject).join(", ")
          : "No subjects"}
      </p>

      <div className="mb-6 grid grid-cols-4 gap-3">
        <StatCard label="Earned" value={balance.earned} />
        <StatCard label="Adjustments" value={balance.adjustments} />
        <StatCard label="Redeemed" value={-balance.redeemed} />
        <StatCard label="Balance" value={balance.balance} highlight />
      </div>

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-medium">Adjust points</h2>
        <AdjustmentForm studentId={id} />
      </div>

      <div className="mb-8">
        <h2 className="mb-3 font-medium">Adjustment history</h2>
        <ul className="flex flex-col gap-2">
          {adjustments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <div>
                <span className={a.amount >= 0 ? "text-green-700" : "text-red-700"}>
                  {a.amount >= 0 ? "+" : ""}
                  {a.amount} pts
                </span>
                {a.reason && <span className="ml-2 text-gray-500">{a.reason}</span>}
              </div>
              <span className="text-xs text-gray-400">
                {a.createdBy.name} · {a.createdAt.toLocaleDateString()}
              </span>
            </li>
          ))}
          {adjustments.length === 0 && (
            <p className="text-sm text-gray-500">No manual adjustments yet.</p>
          )}
        </ul>
      </div>

      <div>
        <h2 className="mb-3 font-medium">Redemption history</h2>
        <ul className="flex flex-col gap-2">
          {redemptions.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <span>{r.catalogueItem.name}</span>
              <span className="text-xs text-gray-400">
                -{r.cost} pts · {r.createdAt.toLocaleDateString()}
              </span>
            </li>
          ))}
          {redemptions.length === 0 && (
            <p className="text-sm text-gray-500">No redemptions yet.</p>
          )}
        </ul>
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
      className={`rounded-lg border p-3 ${
        highlight ? "border-black bg-gray-50" : "border-gray-200 bg-white"
      }`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
