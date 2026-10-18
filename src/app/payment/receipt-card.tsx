import { rm } from "@/lib/fees";
import { type ReceiptData, moneyLines, receiptRows } from "@/lib/receipt";

export const RECEIPT_LOGO_SRC = "/brand/zhao-history-logo.png";

/**
 * The receipt as shown on screen and printed - the same fields, in the same
 * order, as the email (src/lib/receipt.ts). No hooks, so the preview (a
 * client component) and the receipt page (a server one) can both use it.
 */
export function ReceiptCard({ receipt, voided }: { receipt: ReceiptData; voided?: string | null }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-300 bg-white print:rounded-none print:border-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-teal-700 px-6 py-4 print:px-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- a fixed logo, printed as is */}
        <img src={RECEIPT_LOGO_SRC} alt="赵老师历史讲堂" width={208} height={73} className="h-auto w-52" />
        <p className="text-sm font-semibold tracking-wide text-teal-800 uppercase">Official receipt</p>
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
          {moneyLines(receipt).map((l) => (
            <div
              key={l.label}
              className={`flex justify-between gap-4 py-0.5 ${
                l.kind === "saving" ? "text-teal-700" : l.kind === "struck" ? "text-gray-500" : "text-gray-800"
              }`}
            >
              <span>{l.label}</span>
              <span className={`tabular-nums ${l.kind === "struck" ? "line-through" : ""}`}>{rm(l.sen)}</span>
            </div>
          ))}
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
