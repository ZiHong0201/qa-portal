import { PAYMENT_SITE_NAME, rm } from "@/lib/fees";
import { type ReceiptData, receiptRows } from "@/lib/receipt";

/**
 * The receipt as shown on screen and printed - the same fields, in the same
 * order, as the email (src/lib/receipt.ts). No hooks, so the preview (a
 * client component) and the receipt page (a server one) can both use it.
 */
export function ReceiptCard({ receipt, voided }: { receipt: ReceiptData; voided?: string | null }) {
  const saving = receipt.normalSen - receipt.amountSen;
  return (
    <div className="overflow-hidden rounded-xl border border-stone-300 bg-white print:rounded-none print:border-0">
      <div className="bg-teal-800 px-6 py-4 text-white print:bg-white print:px-0 print:text-teal-900">
        <p className="text-xl font-bold">{PAYMENT_SITE_NAME}</p>
        <p className="text-sm opacity-85">Official receipt</p>
      </div>
      <div className="px-6 py-5 print:px-0">
        {voided && (
          <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">VOID - {voided}</p>
        )}
        <dl className="mb-4 grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-gray-500">Receipt no.</dt>
          <dd className="text-right font-mono font-semibold">
            {receipt.receiptNo ?? <span className="font-sans font-normal text-gray-400">given when sent</span>}
          </dd>
          <dt className="text-gray-500">Date paid</dt>
          <dd className="text-right">{receipt.paidOn}</dd>
        </dl>
        <dl className="mb-4 grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
          {receiptRows(receipt).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-gray-500">{k}</dt>
              <dd className="text-gray-900">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="border-t border-stone-200 pt-2 text-sm">
          {saving > 0 && (
            <>
              <div className="flex justify-between py-0.5 text-gray-500">
                <span>Normal price</span>
                <span className="tabular-nums line-through">{rm(receipt.normalSen)}</span>
              </div>
              <div className="flex justify-between gap-4 py-0.5 text-teal-700">
                <span>{receipt.priceNote ?? "Promotion"}</span>
                <span className="tabular-nums">-{rm(saving)}</span>
              </div>
            </>
          )}
          <div className="mt-2 flex items-baseline justify-between rounded-lg bg-teal-50 px-4 py-3 print:bg-white print:px-0">
            <span className="font-semibold text-teal-900">Amount paid</span>
            <span className="text-2xl font-bold tabular-nums text-teal-900">{rm(receipt.amountSen)}</span>
          </div>
        </div>
      </div>
      <p className="border-t border-stone-200 px-6 py-3 text-xs text-gray-400 print:px-0">
        Thank you. Please keep this receipt for your records.
      </p>
    </div>
  );
}
