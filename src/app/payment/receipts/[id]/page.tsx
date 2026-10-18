import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PAYMENT_METHODS, PAYMENT_SITE_NAME, billTotal, isPaymentMethod, monthLabel, parseLines, rm } from "@/lib/fees";
import { PrintButton } from "./print-button";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payment = await prisma.feePayment.findUnique({
    where: { id },
    include: { bill: { include: { payments: { where: { voidedAt: null } } } } },
  });
  if (!payment) notFound();

  const { bill } = payment;
  // What was still owed once this payment was made: everything paid up to and
  // including it, so a later payment does not change an earlier receipt.
  const paidSoFar = bill.payments
    .filter((p) => p.createdAt <= payment.createdAt)
    .reduce((t, p) => t + p.amountSen, 0);
  const balanceAfter = billTotal(bill) - paidSoFar;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/payment/students/${bill.studentId}`} className="text-sm text-teal-700 hover:underline">
          &larr; {bill.studentName}
        </Link>
        <PrintButton />
      </div>

      <div className="relative rounded-xl border border-gray-300 bg-white p-6 print:border-0 print:p-0">
        {payment.voidedAt && (
          <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
            VOID - {payment.voidReason}
          </p>
        )}
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <p className="text-lg font-bold text-teal-800">{PAYMENT_SITE_NAME}</p>
            <p className="text-sm text-gray-500">Official receipt</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono font-semibold">{payment.receiptNo}</p>
            <p className="text-gray-500">{payment.paidOn}</p>
          </div>
        </div>

        <dl className="mb-4 grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
          <dt className="text-gray-500">Received from</dt>
          <dd className="font-medium">{bill.studentName}</dd>
          <dt className="text-gray-500">Grade</dt>
          <dd>{bill.grade ?? "—"}</dd>
          <dt className="text-gray-500">For</dt>
          <dd>Tuition fee, {monthLabel(bill.month)}</dd>
          <dt className="text-gray-500">Paid by</dt>
          <dd>{isPaymentMethod(payment.method) ? PAYMENT_METHODS[payment.method] : payment.method}</dd>
          {payment.note && (
            <>
              <dt className="text-gray-500">Note</dt>
              <dd>{payment.note}</dd>
            </>
          )}
        </dl>

        <table className="mb-4 w-full text-sm">
          <tbody>
            {parseLines(bill.lines).map((l) => (
              <tr key={l.subject}>
                <td className="py-0.5 text-gray-700">{l.subject}</td>
                <td className="py-0.5 text-right tabular-nums">{rm(l.amountSen)}</td>
              </tr>
            ))}
            {bill.adjustmentSen !== 0 && (
              <tr>
                <td className="py-0.5 text-gray-700">Adjustment{bill.note ? ` - ${bill.note}` : ""}</td>
                <td className="py-0.5 text-right tabular-nums">{rm(bill.adjustmentSen)}</td>
              </tr>
            )}
            <tr className="border-t border-gray-200">
              <td className="pt-1 text-gray-700">Total for the month</td>
              <td className="pt-1 text-right tabular-nums">{rm(billTotal(bill))}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex items-center justify-between rounded-lg bg-teal-50 px-4 py-3">
          <span className="font-medium text-teal-900">Amount received</span>
          <span className="text-xl font-bold tabular-nums text-teal-900">{rm(payment.amountSen)}</span>
        </div>
        {!payment.voidedAt && (
          <p className="mt-2 text-right text-sm text-gray-600">
            {balanceAfter > 0 ? `Balance still owing for the month: ${rm(balanceAfter)}` : "Paid in full for the month."}
          </p>
        )}
      </div>
    </div>
  );
}
