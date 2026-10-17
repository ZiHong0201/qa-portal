"use client";

import { Fragment, useState, useTransition } from "react";
import { markGiftsDelivered, rejectGiftExchange, undoGiftDelivered } from "@/lib/actions/catalogue";

export type PendingGift = {
  id: string;
  student: string;
  grade: string | null;
  gift: string;
  exchangedOn: string;
};

export type DeliveredGift = PendingGift & { deliveredOn: string };

export type RejectedGift = Omit<PendingGift, "exchangedOn"> & {
  refunded: number;
  reason: string;
  rejectedOn: string;
};

// Bilingual, because the student reads it on their Gift Exchange page.
const REJECT_PRESETS = [
  "Stok habis / Out of stock",
  "Hadiah tidak lagi ditawarkan / Gift no longer offered",
];

/**
 * Gifts exchanged and not yet handed over - what to pack for the next
 * material delivery. Sorted by grade, then name, so a class's gifts sit
 * together the way they will be handed out; the summary on top says how many
 * of each to pull from the shelf.
 */
export function PendingGifts({
  pending,
  recentlyDelivered,
  recentlyRejected,
}: {
  pending: PendingGift[];
  recentlyDelivered: DeliveredGift[];
  recentlyRejected: RejectedGift[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, start] = useTransition();
  // The row whose reject form is open, and what has been typed into it.
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  const reject = (p: PendingGift) => {
    if (!confirm(`Reject ${p.student}'s ${p.gift} and refund the points?`)) return;
    start(async () => {
      const r = await rejectGiftExchange(p.id, reason);
      if (r.error) {
        setRejectError(r.error);
        return;
      }
      setRejecting(null);
      setReason("");
      setRejectError(null);
      setSelected((sel) => {
        const next = new Set(sel);
        next.delete(p.id);
        return next;
      });
    });
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allChosen = pending.length > 0 && pending.every((p) => selected.has(p.id));

  const deliver = (ids: string[], what: string) => {
    if (!confirm(`Mark ${what} as delivered?`)) return;
    start(async () => {
      await markGiftsDelivered(ids);
      setSelected(new Set());
    });
  };

  const counts = new Map<string, number>();
  for (const p of pending) counts.set(p.gift, (counts.get(p.gift) ?? 0) + 1);

  return (
    <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-amber-900">
          Pending gift preparation
          <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs">{pending.length}</span>
        </h2>
        {pending.length > 0 && (
          <div className="flex gap-2">
            <button
              disabled={busy || selected.size === 0}
              onClick={() => deliver([...selected], `${selected.size} gift${selected.size === 1 ? "" : "s"}`)}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              Mark selected delivered
            </button>
            <button
              disabled={busy}
              onClick={() => deliver(pending.map((p) => p.id), `all ${pending.length} pending gifts`)}
              className="rounded-md border border-emerald-600 bg-white px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
            >
              Mark all delivered
            </button>
          </div>
        )}
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-amber-800">Nothing to prepare - every exchanged gift has been delivered.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-amber-900">
            To pack:{" "}
            {[...counts.entries()].map(([gift, n], i) => (
              <span key={gift}>
                {i > 0 && " · "}
                <span className="font-medium">{gift}</span> ×{n}
              </span>
            ))}
          </p>
          <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-amber-100/60 text-left text-xs text-amber-900">
                <tr>
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={allChosen}
                      onChange={() => setSelected(allChosen ? new Set() : new Set(pending.map((p) => p.id)))}
                    />
                  </th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Grade</th>
                  <th className="px-3 py-2">Gift</th>
                  <th className="px-3 py-2">Exchanged</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pending.map((p) => (
                  <Fragment key={p.id}>
                  <tr>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.student}`}
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">{p.student}</td>
                    <td className="px-3 py-2 text-gray-600">{p.grade ?? "—"}</td>
                    <td className="px-3 py-2">{p.gift}</td>
                    <td className="px-3 py-2 text-gray-500">{p.exchangedOn}</td>
                    <td className="px-3 py-2 text-right">
                      <span className="flex justify-end gap-3">
                        <button
                          disabled={busy}
                          onClick={() => deliver([p.id], `${p.student}'s ${p.gift}`)}
                          className="text-emerald-700 hover:underline disabled:opacity-40"
                        >
                          Delivered
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => {
                            setRejecting(rejecting === p.id ? null : p.id);
                            setReason("");
                            setRejectError(null);
                          }}
                          className="text-rose-600 hover:underline disabled:opacity-40"
                        >
                          Reject
                        </button>
                      </span>
                    </td>
                  </tr>
                  {rejecting === p.id && (
                    <tr className="bg-rose-50">
                      <td />
                      <td colSpan={5} className="px-3 py-3">
                        <p className="mb-2 text-xs text-rose-800">
                          Rejecting refunds the points and returns the gift to stock.{" "}
                          {p.student} will see this reason:
                        </p>
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {REJECT_PRESETS.map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setReason(r)}
                              className="rounded-full border border-rose-200 bg-white px-2.5 py-0.5 text-xs text-rose-800 hover:bg-rose-100"
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            maxLength={300}
                            placeholder="Reason"
                            aria-label="Reason for rejecting"
                            className="min-w-[16rem] flex-1 rounded-md border border-rose-200 bg-white px-3 py-1.5 text-sm"
                          />
                          <button
                            disabled={busy || !reason.trim()}
                            onClick={() => reject(p)}
                            className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700 disabled:opacity-40"
                          >
                            Reject and refund
                          </button>
                          <button
                            onClick={() => setRejecting(null)}
                            className="text-sm text-gray-600 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                        {rejectError && <p className="mt-2 text-xs text-red-700">{rejectError}</p>}
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {recentlyDelivered.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-amber-900">Recently delivered</summary>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {recentlyDelivered.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-md bg-white px-3 py-1.5">
                <span className="font-medium">{d.student}</span>
                <span className="text-gray-500">{d.grade ?? "—"}</span>
                <span>{d.gift}</span>
                <span className="text-xs text-gray-400">delivered {d.deliveredOn}</span>
                <button
                  disabled={busy}
                  onClick={() => start(() => undoGiftDelivered(d.id))}
                  className="ml-auto text-xs text-amber-700 hover:underline disabled:opacity-40"
                  title="Put it back on the list - for one marked by mistake"
                >
                  Undo
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {recentlyRejected.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-amber-900">Recently rejected</summary>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {recentlyRejected.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-md bg-white px-3 py-1.5">
                <span className="font-medium">{r.student}</span>
                <span className="text-gray-500">{r.grade ?? "—"}</span>
                <span>{r.gift}</span>
                <span className="text-xs text-emerald-700">+{r.refunded} pts refunded</span>
                <span className="text-xs text-gray-500">&ldquo;{r.reason}&rdquo;</span>
                <span className="ml-auto text-xs text-gray-400">rejected {r.rejectedOn}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
