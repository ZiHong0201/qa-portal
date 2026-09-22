import { previewReset, lastReset } from "@/lib/reset.server";
import { formatResetDate, daysUntilReset, resetPhase, WARNING_DAYS } from "@/lib/reset";
import { ResetForm } from "./reset-form";

export default async function AdminResetPage() {
  const [counts, previous] = await Promise.all([previewReset(), lastReset()]);
  const phase = resetPhase();

  const rows: [string, number][] = [
    ["Answers submitted", counts.submissions],
    ["Daily check-ins", counts.checkIns],
    ["Point adjustments", counts.adjustments],
    ["Catalogue redemptions", counts.redemptions],
    ["Cat purchases", counts.petPurchases],
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">Reset the portal</h1>
      <p className="mb-6 text-sm text-gray-500">
        Wipes every student back to zero. This happens automatically on{" "}
        <strong>{formatResetDate()}</strong>, with {WARNING_DAYS} days&rsquo; warning shown to
        everyone beforehand — you only need this page to do it early.
      </p>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium text-gray-800">
          {phase === "due"
            ? "The scheduled reset is due."
            : `Scheduled reset is ${daysUntilReset()} days away.`}
        </p>
        {previous ? (
          <p className="mt-1 text-xs text-gray-500">
            Last reset {previous.ranAt.toLocaleString()} —{" "}
            {previous.submissionsCleared.toLocaleString()} answers cleared.{" "}
            {previous.snapshotUrl && (
              <a
                href={previous.snapshotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                snapshot
              </a>
            )}
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-500">The portal has never been reset.</p>
        )}
      </div>

      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-900">What would be deleted right now</p>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-red-800">
          {rows.map(([label, n]) => (
            <li key={label} className="flex justify-between">
              <span>{label}</span>
              <span className="font-mono">{n.toLocaleString()}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-red-700">
          Accounts, question sets, catalogue items and the cats themselves are kept. A JSON
          snapshot is saved to blob storage before anything is deleted, so a reset run by mistake
          can still be recovered from.
        </p>
      </div>

      <ResetForm counts={counts} />
    </div>
  );
}
