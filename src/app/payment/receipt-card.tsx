import { COMPANY, type ReceiptData, money, receiptLayout } from "@/lib/receipt";

/**
 * The receipt as shown on screen and printed, following YH Ideal Academy's
 * own template - the same lines as the email (src/lib/receipt.ts). No hooks,
 * so the preview (a client component) and the receipt page (a server one)
 * can both use it.
 */
export function ReceiptCard({ receipt, voided }: { receipt: ReceiptData; voided?: string | null }) {
  const L = receiptLayout(receipt);
  const totals: [string, string][] = [
    ["SUBTOTAL", money(L.subtotalSen)],
    ["DISCOUNT", L.discountSen ? money(L.discountSen) : ""],
    ["SUBTOTAL LESS DISCOUNT", money(L.lessDiscountSen)],
    ["TAX RATE", "0.00%"],
    ["TOTAL TAX", "0.00"],
    ["SHIPPING/HANDLING", "0.00"],
  ];
  return (
    <div className="overflow-hidden border border-stone-300 bg-white text-[#111] print:border-0">
      <div className="h-5" style={{ background: COMPANY.red }} />
      <div className="px-7 pt-6 pb-2">
        {voided && (
          <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">VOID - {voided}</p>
        )}
        <p className="mb-4 text-3xl">OFFICIAL RECEIPT</p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="text-sm leading-relaxed">
            <p className="font-bold">{COMPANY.name}</p>
            <p>{COMPANY.regNo}</p>
            {COMPANY.address.map((a) => (
              <p key={a}>{a}</p>
            ))}
          </div>
          <div className="flex flex-col items-end gap-2 text-sm font-bold">
            <span className="border border-[#bfbfbf] px-4 py-1.5">{L.date}</span>
            <span className="border border-[#bfbfbf] px-4 py-1.5">
              RECEIPT NO. {L.receiptNo || <span className="font-normal text-gray-400">given when sent</span>}
            </span>
          </div>
        </div>
      </div>

      <div className="px-7 pt-3">
        <p className="border-b border-[#bfbfbf] pb-1 text-sm font-bold">BILL TO</p>
        <p className="mt-1.5 text-sm font-bold">{L.billTo[0]}</p>
        <p className="text-xs text-gray-600">{L.billTo[1]}</p>
      </div>

      <div className="overflow-x-auto px-7 py-4">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="text-white" style={{ background: COMPANY.red }}>
              <th className="px-2 py-1.5 text-center font-bold">DESCRIPTION</th>
              <th className="w-12 px-2 py-1.5 text-center font-bold">QTY</th>
              <th className="w-24 px-2 py-1.5 text-center font-bold">UNIT PRICE</th>
              <th className="w-24 px-2 py-1.5 text-center font-bold">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {L.items.map((i) => (
              <tr key={i.description}>
                <td className="border border-[#bfbfbf] px-2 py-1.5">
                  {i.description}
                  {i.detail && <span className="block text-[11px] text-gray-500">{i.detail}</span>}
                </td>
                <td className="border border-[#bfbfbf] px-2 py-1.5 text-center">{i.qty}</td>
                <td className="border border-[#bfbfbf] px-2 py-1.5 text-right tabular-nums">{money(i.unitSen)}</td>
                <td className="border border-[#bfbfbf] px-2 py-1.5 text-right tabular-nums">{money(i.totalSen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col-reverse gap-4 px-7 sm:flex-row sm:items-start">
        <div className="flex-1 text-[11px] leading-relaxed text-gray-700">
          <p>{COMPANY.paymentNote}</p>
          <p className="mt-3">{COMPANY.bank[0]}</p>
          <p>{COMPANY.bank[1]}</p>
        </div>
        <table className="text-xs sm:w-72">
          <tbody>
            {totals.map(([k, v]) => (
              <tr key={k}>
                <td className="px-2.5 py-1 text-right font-bold whitespace-nowrap">{k}</td>
                <td className="w-28 border-b border-gray-200 px-2 py-1 text-right tabular-nums">{v}</td>
              </tr>
            ))}
            <tr>
              <td className="px-2.5 py-2.5 text-right text-sm font-bold">Paid</td>
              <td className="border-y-2 border-[#111] px-2 py-2.5 text-right text-sm font-bold whitespace-nowrap tabular-nums">
                MYR {money(L.paidSen)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="px-7 pt-6 pb-4 text-center text-xs text-gray-700 italic">{COMPANY.footer}</p>
      <div className="h-5" style={{ background: COMPANY.red }} />
    </div>
  );
}
