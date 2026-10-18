import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/check-in";
import {
  PAYMENT_METHODS,
  STATUS_LABEL,
  STATUS_STYLE,
  isPaymentMethod,
  monthKey,
  monthLabel,
  portalHref,
  rm,
} from "@/lib/fees";
import { getBills } from "@/lib/fees.server";
import {
  AdjustBillForm,
  CreateStudentBillForm,
  DeleteBillButton,
  PaymentForm,
  StudentRateForm,
  VoidPaymentButton,
} from "../../forms";

export default async function PaymentStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [student, bills, subjects, rates] = await Promise.all([
    prisma.user.findFirst({
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
    }),
    getBills({ studentId: id }),
    prisma.subject.findMany({ select: { name: true, monthlyFeeSen: true } }),
    prisma.studentFeeRate.findMany({ where: { studentId: id } }),
  ]);
  // A deleted student's bills and receipts are kept, so the page still opens
  // for them - from the name recorded on the bills.
  if (!student && bills.length === 0) notFound();

  const name = student?.name ?? bills[0].studentName;
  const usual = new Map(subjects.map((s) => [s.name, s.monthlyFeeSen]));
  const own = new Map(rates.map((r) => [r.subject, r]));
  const owing = bills.reduce((t, b) => t + Math.max(0, b.balanceSen), 0);
  const today = dayKey();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/payment/students" className="text-sm text-teal-700 hover:underline">
          &larr; Students
        </Link>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{name}</h1>
            <p className="text-sm text-gray-600">
              {student ? (
                <>
                  {student.grade ?? "No grade"} · {student.email} ·{" "}
                  <a href={portalHref(`/admin/students/${student.id}`)} className="text-teal-700 hover:underline">
                    View in portal &#8599;
                  </a>
                </>
              ) : (
                "This student's portal account has been deleted. Their fee records are kept."
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Owing, all months</p>
            <p className={`text-2xl font-semibold tabular-nums ${owing ? "text-rose-700" : "text-teal-700"}`}>
              {rm(owing)}
            </p>
          </div>
        </div>
        {student?.suspendedAt && (
          <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
            Suspended on the portal{student.suspensionReason ? `: ${student.suspensionReason}` : ""}. Lift it from
            their portal page once fees are settled.
          </p>
        )}
      </div>

      {student && (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-1 font-semibold text-stone-900">Monthly fee</h2>
          <p className="mb-3 text-xs text-gray-500">
            One line per subject they are enrolled in. Leave a box blank for the usual fee; fill it in for an amount
            just for this student.
          </p>
          {student.subjects.length === 0 ? (
            <p className="text-sm text-gray-500">Not enrolled in any subject on the portal.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {student.subjects.map(({ subject }) => {
                const rate = own.get(subject);
                const base = usual.get(subject) ?? null;
                return (
                  <li key={subject} className="grid gap-2 sm:grid-cols-[12rem_1fr] sm:items-center">
                    <div>
                      <p className="text-sm font-medium">{subject}</p>
                      <p className="text-xs text-gray-500">
                        Usual: {base === null ? "not set" : rm(base)}
                        {rate && <span className="text-teal-700"> · this student: {rm(rate.monthlyFeeSen)}</span>}
                      </p>
                    </div>
                    <StudentRateForm
                      studentId={student.id}
                      subject={subject}
                      ownSen={rate?.monthlyFeeSen ?? null}
                      note={rate?.note ?? null}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-stone-900">Bills</h2>
          {student && <CreateStudentBillForm studentId={student.id} defaultMonth={monthKey()} />}
        </div>
        {bills.length === 0 && <p className="text-sm text-gray-500">No bills yet.</p>}
        <div className="flex flex-col gap-3">
          {bills.map((b) => (
            <article key={b.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-stone-900">{monthLabel(b.month)}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status]}`}>
                  {STATUS_LABEL[b.status]}
                </span>
              </div>

              <table className="mb-3 w-full max-w-md text-sm">
                <tbody>
                  {b.lines.map((l) => (
                    <tr key={l.subject}>
                      <td className="py-0.5 text-gray-700">{l.subject}</td>
                      <td className="py-0.5 text-right tabular-nums">{rm(l.amountSen)}</td>
                    </tr>
                  ))}
                  {b.adjustmentSen !== 0 && (
                    <tr>
                      <td className="py-0.5 text-gray-700">Adjustment{b.note ? ` - ${b.note}` : ""}</td>
                      <td className="py-0.5 text-right tabular-nums">{rm(b.adjustmentSen)}</td>
                    </tr>
                  )}
                  <tr className="border-t border-gray-200 font-medium">
                    <td className="pt-1">Total</td>
                    <td className="pt-1 text-right tabular-nums">{rm(b.totalSen)}</td>
                  </tr>
                  <tr className="text-teal-700">
                    <td>Paid</td>
                    <td className="text-right tabular-nums">{rm(b.paidSen)}</td>
                  </tr>
                  <tr className={`font-semibold ${b.balanceSen > 0 ? "text-rose-700" : "text-gray-500"}`}>
                    <td>Balance</td>
                    <td className="text-right tabular-nums">{rm(b.balanceSen)}</td>
                  </tr>
                </tbody>
              </table>

              {b.payments.length > 0 && (
                <ul className="mb-3 flex flex-col gap-1 text-sm">
                  {b.payments.map((p) => (
                    <li
                      key={p.id}
                      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-3 py-1.5 ${p.voidedAt ? "bg-gray-50 text-gray-400" : "bg-teal-50/60"}`}
                    >
                      <Link href={`/payment/receipts/${p.id}`} className="font-mono text-xs text-teal-800 hover:underline">
                        {p.receiptNo}
                      </Link>
                      <span className={`tabular-nums ${p.voidedAt ? "line-through" : "font-medium"}`}>{rm(p.amountSen)}</span>
                      <span>{isPaymentMethod(p.method) ? PAYMENT_METHODS[p.method] : p.method}</span>
                      <span className="text-gray-500">{p.paidOn}</span>
                      {p.note && <span className="text-gray-500">&ldquo;{p.note}&rdquo;</span>}
                      {p.voidedAt ? (
                        <span className="text-xs text-rose-700">Voided: {p.voidReason}</span>
                      ) : (
                        <span className="ml-auto">
                          <VoidPaymentButton paymentId={p.id} receiptNo={p.receiptNo} />
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {b.balanceSen > 0 && (
                <div className="mb-3 rounded-lg border border-teal-100 bg-teal-50/40 p-3">
                  <p className="mb-2 text-xs font-medium text-teal-900">Record a payment</p>
                  {/* Keyed on the balance, so after a payment it starts again from what is left. */}
                  <PaymentForm key={`${b.id}-${b.balanceSen}`} billId={b.id} balanceSen={b.balanceSen} today={today} />
                </div>
              )}

              <details className="text-sm">
                <summary className="cursor-pointer text-gray-600">Adjust or delete this bill</summary>
                <div className="mt-2 flex flex-col gap-2">
                  <p className="text-xs text-gray-500">
                    An adjustment is added to the total: -20 for a discount, 15 for something extra.
                  </p>
                  <AdjustBillForm billId={b.id} adjustmentSen={b.adjustmentSen} note={b.note} />
                  {b.payments.length === 0 && <DeleteBillButton billId={b.id} label={monthLabel(b.month)} />}
                </div>
              </details>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
