"use client";

import { useState, useTransition } from "react";
import { markGiftsDelivered, undoGiftDelivered } from "@/lib/actions/catalogue";

export type PendingGift = {
  id: string;
  student: string;
  grade: string | null;
  gift: string;
  exchangedOn: string;
};

export type DeliveredGift = PendingGift & { deliveredOn: string };

/**
 * Gifts exchanged and not yet handed over - what to pack for the next
 * material delivery. Sorted by grade, then name, so a class's gifts sit
 * together the way they will be handed out; the summary on top says how many
 * of each to pull from the shelf.
 */
export function PendingGifts({
  pending,
  recentlyDelivered,
}: {
  pending: PendingGift[];
  recentlyDelivered: DeliveredGift[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, start] = useTransition();

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
                  <tr key={p.id}>
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
                      <button
                        disabled={busy}
                        onClick={() => deliver([p.id], `${p.student}'s ${p.gift}`)}
                        className="text-emerald-700 hover:underline disabled:opacity-40"
                      >
                        Delivered
                      </button>
                    </td>
                  </tr>
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
    </section>
  );
}
