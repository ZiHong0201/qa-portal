import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { periodLabel, portalHref, rm } from "@/lib/fees";
import { getReceipts } from "@/lib/fees.server";
import { DeleteStudentButton, GradeSubjectsForm } from "../../student-forms";

export default async function PaymentStudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const student = await prisma.user.findFirst({
    where: { id, role: "STUDENT" },
    select: {
      id: true,
      name: true,
      email: true,
      grade: true,
      suspendedAt: true,
      suspensionReason: true,
      subjects: { select: { subject: true }, orderBy: { subject: "asc" } },
    },
  });
  if (!student) notFound();

  const [grades, subjects, receipts] = await Promise.all([
    prisma.grade.findMany({ orderBy: { order: "asc" }, select: { name: true } }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    // Receipts stand apart from accounts; the email is what ties them to a student.
    getReceipts({ email: student.email }, 20),
  ]);
  const enrolled = student.subjects.map((s) => s.subject);
  const receiptLink = `/payment/receipts/new?${new URLSearchParams([
    ["name", student.name],
    ["email", student.email],
    ["grade", student.grade ?? ""],
    ...enrolled.map((s) => ["subjects", s]),
  ])}`;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/payment/students" className="text-sm text-teal-700 hover:underline">
          &larr; Students
        </Link>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{student.name}</h1>
            <p className="text-sm text-gray-600">
              {student.email} ·{" "}
              <a href={portalHref(`/admin/students/${student.id}`)} className="text-teal-700 hover:underline">
                View in exercise portal &#8599;
              </a>
            </p>
          </div>
          <Link href={receiptLink} className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
            Make a receipt
          </Link>
        </div>
        {created && (
          <p className="mt-3 rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800">
            Account created. {student.name} can now log in to the exercise portal with {student.email}.
          </p>
        )}
        {student.suspendedAt && (
          <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
            Suspended on the portal{student.suspensionReason ? `: ${student.suspensionReason}` : ""}. Lift it from their
            portal page.
          </p>
        )}
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-1 font-semibold text-stone-900">Grade and subjects</h2>
        <p className="mb-3 text-xs text-gray-500">
          These decide which question sets {student.name} sees on the exercise portal, and the fee.
        </p>
        <GradeSubjectsForm
          studentId={student.id}
          grades={grades.map((g) => g.name)}
          subjects={subjects.map((s) => s.name)}
          grade={student.grade ?? ""}
          enrolled={enrolled}
        />
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-stone-900">Receipts sent to {student.email}</h2>
        {receipts.length === 0 ? (
          <p className="text-sm text-gray-500">None yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white text-sm">
            {receipts.map((r) => (
              <li key={r.id} className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 ${r.voidedAt ? "text-gray-400" : ""}`}>
                <Link href={`/payment/receipts/${r.id}`} className="font-mono text-xs text-teal-800 hover:underline">
                  {r.receiptNo}
                </Link>
                <span>{r.paidOn}</span>
                <span className="text-gray-600">{periodLabel(r.startMonth, r.months)}</span>
                <span className={`ml-auto font-medium tabular-nums ${r.voidedAt ? "line-through" : ""}`}>{rm(r.amountSen)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-red-200 bg-red-50/40 p-4">
        <h2 className="mb-1 font-semibold text-red-800">Delete account</h2>
        <p className="mb-3 text-sm text-gray-700">
          Removes {student.name}&apos;s exercise portal account, with all their answers, marks and points. It cannot be
          undone. Receipts are kept.
        </p>
        <DeleteStudentButton studentId={student.id} name={student.name} />
      </section>
    </div>
  );
}
