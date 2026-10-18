import Link from "next/link";
import { isMonthKey, monthKey, monthLabel, periodLabel, rm, shiftMonth } from "@/lib/fees";
import { getReceipts } from "@/lib/fees.server";
import { mailConfigured } from "@/lib/mailer";

/** Receipts made in a month, newest first, with what was received. */
export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; q?: string }>;
}) {
  const params = await searchParams;
  const month = isMonthKey(params.month) ? params.month : monthKey();
  const q = (params.q ?? "").trim();

  // By the date the money came in, which is the month the receipt belongs to.
  const receipts = await getReceipts({
    paidOn: { startsWith: month },
    // A child's name is found inside the receipt's list of children.
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q.toLowerCase() } },
            { receiptNo: { contains: q } },
            { students: { contains: q } },
          ],
        }
      : {}),
  });
  const standing = receipts.filter((r) => !r.voidedAt);
  const received = standing.reduce((t, r) => t + r.amountSen, 0);
  const unsent = standing.filter((r) => !r.sentAt).length;

  const href = (m: string) => `/payment?${new URLSearchParams({ month: m, ...(q ? { q } : {}) })}`;

  return (
    <div>
      {!mailConfigured() && (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Email is not set up on this server yet, so receipts are saved but not sent. Add GMAIL_USER and
          GMAIL_APP_PASSWORD to the Vercel project, then use &ldquo;Send again&rdquo; on each receipt.
        </p>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={href(shiftMonth(month, -1))} className="rounded-md border border-gray-300 bg-white px-2.5 py-1 hover:bg-gray-50" aria-label="Previous month">
            &larr;
          </Link>
          <h1 className="min-w-44 text-center text-2xl font-bold text-stone-900">{monthLabel(month)}</h1>
          <Link href={href(shiftMonth(month, 1))} className="rounded-md border border-gray-300 bg-white px-2.5 py-1 hover:bg-gray-50" aria-label="Next month">
            &rarr;
          </Link>
          {month !== monthKey() && (
            <Link href={href(monthKey())} className="text-sm text-teal-700 hover:underline">
              This month
            </Link>
          )}
        </div>
        <Link
          href="/payment/receipts/new"
          className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          + New receipt
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Received" value={rm(received)} tone="text-teal-700" />
        <Stat label="Receipts" value={String(standing.length)} />
        <Stat label="Not emailed yet" value={String(unsent)} tone={unsent ? "text-amber-700" : undefined} />
      </div>

      <form className="mb-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="month" value={month} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search parent, child, email or receipt no."
          aria-label="Search receipts"
          className="w-72 max-w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
        />
        <button className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">Search</button>
        {q && (
          <Link href={href(month).replace(/&?q=[^&]*/, "")} className="text-sm text-teal-700 hover:underline">
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-100 text-left text-xs text-stone-600">
            <tr>
              <th className="px-3 py-2">Receipt</th>
              <th className="px-3 py-2">Paid</th>
              <th className="px-3 py-2">Bill to</th>
              <th className="px-3 py-2">Children</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {receipts.map((r) => (
              <tr key={r.id} className={r.voidedAt ? "text-gray-400" : "hover:bg-stone-50"}>
                <td className="px-3 py-2">
                  <Link href={`/payment/receipts/${r.id}`} className="font-mono text-xs text-teal-800 hover:underline">
                    {r.receiptNo}
                  </Link>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{r.paidOn}</td>
                <td className="px-3 py-2">
                  <span className="font-medium">{r.name}</span>
                  <span className="block text-xs text-gray-500">{r.email}</span>
                </td>
                <td className="px-3 py-2">
                  {r.students.map((c, i) => (
                    <span key={i} className="block">
                      {c.name} <span className="text-xs text-gray-500">({c.grade})</span>
                      <span className="block text-xs text-gray-500">
                        {c.subjects.length} subject{c.subjects.length === 1 ? "" : "s"} ·{" "}
                        {periodLabel(c.startMonth, c.months)}
                      </span>
                    </span>
                  ))}
                </td>
                <td className={`px-3 py-2 text-right font-medium tabular-nums ${r.voidedAt ? "line-through" : ""}`}>
                  {rm(r.amountSen)}
                </td>
                <td className="px-3 py-2">
                  {r.voidedAt ? (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">Void</span>
                  ) : r.sentAt ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Sent</span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Not sent</span>
                  )}
                </td>
              </tr>
            ))}
            {receipts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  No receipts {q ? "match" : `for ${monthLabel(month)}`}.{" "}
                  <Link href="/payment/receipts/new" className="text-teal-700 underline">
                    Make one
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
