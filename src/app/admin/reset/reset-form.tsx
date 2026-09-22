"use client";

import { useActionState, useState } from "react";
import { resetPortalNow } from "@/lib/actions/reset";

export function ResetForm({ counts }: { counts: Record<string, number> }) {
  const [state, formAction, pending] = useActionState(resetPortalNow, {});
  const [confirm, setConfirm] = useState("");
  const armed = confirm.trim().toUpperCase() === "RESET";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm break-all text-emerald-800">
          {state.success}
        </p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="confirm">
          Type <span className="font-mono font-bold">RESET</span> to confirm
        </label>
        <input
          id="confirm"
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
          className="w-48 rounded-md border border-gray-300 px-3 py-2 font-mono"
        />
      </div>

      {/* Disabled until the phrase matches, and checked again on the server -
          the button is a courtesy, the server check is the actual guard. */}
      <button
        type="submit"
        disabled={pending || !armed}
        className="self-start rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {pending
          ? "Resetting…"
          : `Delete ${counts.submissions.toLocaleString()} answers and reset everyone to zero`}
      </button>
    </form>
  );
}
