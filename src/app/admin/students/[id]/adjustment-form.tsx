"use client";

import { useActionState } from "react";
import { createPointAdjustment } from "@/lib/actions/pointAdjustments";

export function AdjustmentForm({ studentId }: { studentId: string }) {
  const [state, formAction, pending] = useActionState(
    createPointAdjustment.bind(null, studentId),
    {}
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <div className="flex gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="amount">
            Amount
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            required
            placeholder="e.g. 50 or -20"
            className="w-32 rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium" htmlFor="reason">
            Reason (optional)
          </label>
          <input
            id="reason"
            name="reason"
            placeholder="e.g. Bonus for helping in class"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Apply adjustment"}
      </button>
      <p className="text-xs text-gray-500">
        Use a positive number to credit points, or a negative number to deduct them.
      </p>
    </form>
  );
}
