"use client";

import { useActionState, useState, useTransition } from "react";
import { liftSuspension, suspendStudent, type SuspendState } from "@/lib/actions/suspension";
import { SUSPENSION_REASON_MAX } from "@/lib/suspension-rules";

// The common cases, one tap each. Bilingual because the student reads it.
const PRESETS = [
  "Yuran tuisyen belum dibayar / Tuition fee not paid",
  "Melanggar peraturan / Violated the rules",
];

/**
 * Suspend a student with a reason, change the reason, or lift it.
 *
 * The reason is shown to the student word for word on every page they open,
 * so the panel says so - it is not a private note.
 */
export function SuspensionPanel({
  studentId,
  studentName,
  suspension,
  canEdit,
}: {
  studentId: string;
  studentName: string;
  suspension: { reason: string; since: string; by: string | null } | null;
  /** Admins can suspend and lift; teachers only see the state. */
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState<SuspendState, FormData>(
    suspendStudent.bind(null, studentId),
    {}
  );
  // Held in state so a validation error does not wipe what was typed - React
  // resets uncontrolled form fields after every action.
  const [reason, setReason] = useState(suspension?.reason ?? "");
  // When "Change reason" was pressed. The form closes again once a save
  // lands after that moment - derived, so no effect has to watch for it.
  const [editingSince, setEditingSince] = useState<number | null>(null);
  const editing = editingSince !== null && !(state.savedAt && state.savedAt > editingSince);
  const [lifting, startLift] = useTransition();

  if (suspension && !editing) {
    return (
      <div className="mb-8 rounded-lg border border-rose-200 bg-rose-50 p-4">
        <h2 className="font-medium text-rose-800">Account suspended</h2>
        <p className="mt-1 whitespace-pre-wrap text-sm text-rose-900">{suspension.reason}</p>
        <p className="mt-1 text-xs text-rose-700/70">
          Since {suspension.since}
          {suspension.by ? ` · by ${suspension.by}` : ""} · {studentName} sees only this reason
          when they log in.
        </p>
        {canEdit && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={lifting}
              onClick={() => {
                if (confirm(`Lift the suspension? ${studentName} will be able to use the portal again.`)) {
                  startLift(() => liftSuspension(studentId));
                }
              }}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {lifting ? "Lifting…" : "Lift suspension"}
            </button>
            <button
              type="button"
              onClick={() => setEditingSince(Date.now())}
              className="rounded-md border border-rose-300 bg-white px-4 py-2 text-sm text-rose-700 hover:bg-rose-100"
            >
              Change reason
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!canEdit) return null;

  return (
    <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h2 className="mb-1 font-medium text-amber-900">
        {suspension ? "Change suspension reason" : "Suspend account"}
      </h2>
      <p className="mb-3 text-sm text-amber-800">
        {studentName} can still log in, but will see only a notice with this reason and
        &ldquo;Please contact admin if you think this is a mistake&rdquo;. Their marks, points and
        answers are kept, and come back when the suspension is lifted.
      </p>
      <form
        action={action}
        onSubmit={(e) => {
          if (!suspension && !confirm(`Suspend ${studentName}'s account?`)) e.preventDefault();
        }}
        className="flex flex-col gap-2"
      >
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setReason(p)}
              className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs text-amber-900 hover:bg-amber-100"
            >
              {p}
            </button>
          ))}
        </div>
        <textarea
          name="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          maxLength={SUSPENSION_REASON_MAX}
          rows={2}
          placeholder="Reason - the student will see this"
          className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm"
        />
        {state.error && <p className="text-sm text-red-700">{state.error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {pending ? "Saving…" : suspension ? "Save reason" : "Suspend account"}
          </button>
          {suspension && (
            <button
              type="button"
              onClick={() => setEditingSince(null)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
