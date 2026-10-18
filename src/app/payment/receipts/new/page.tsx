import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/check-in";
import { monthKey } from "@/lib/fees";
import { ReceiptBuilder } from "../../receipt-forms";

/**
 * A new receipt. Opened from a student's page it arrives filled in with
 * their name, email, grade and subjects (as ?name=&email=&grade=&subjects=);
 * otherwise it starts blank, for anyone.
 */
export default async function NewReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; email?: string; grade?: string; subjects?: string | string[] }>;
}) {
  const params = await searchParams;
  const [grades, subjects] = await Promise.all([
    prisma.grade.findMany({ orderBy: { order: "asc" }, select: { name: true } }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  const subjectNames = subjects.map((s) => s.name);
  const given = ([] as string[]).concat(params.subjects ?? []).filter((s) => subjectNames.includes(s));

  return (
    <div className="max-w-2xl">
      <Link href="/payment" className="text-sm text-teal-700 hover:underline">
        &larr; Receipts
      </Link>
      <h1 className="mt-1 mb-5 text-2xl font-bold text-stone-900">New receipt</h1>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <ReceiptBuilder
          grades={grades.map((g) => g.name)}
          subjects={subjectNames}
          startMonth={monthKey()}
          today={dayKey()}
          initial={{
            name: params.name ?? "",
            email: params.email ?? "",
            grade: grades.some((g) => g.name === params.grade) ? params.grade! : "",
            subjects: given,
          }}
        />
      </div>
    </div>
  );
}
