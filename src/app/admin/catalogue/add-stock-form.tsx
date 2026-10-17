"use client";

import { useActionState, useState } from "react";
import { addStock } from "@/lib/actions/catalogue";

/** Replenish a gift's stock from the list, without opening the edit form. */
export function AddStockForm({ itemId }: { itemId: string }) {
  const [amount, setAmount] = useState("");
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => {
      const result = await addStock(itemId, formData);
      if (!result.error) setAmount("");
      return result;
    },
    {}
  );

  return (
    <form action={action} className="flex items-center gap-1.5">
      <input
        name="amount"
        type="number"
        min={1}
        max={100000}
        required
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Qty"
        aria-label="How many to add"
        className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-sky-300 px-2.5 py-1 text-sm text-sky-700 hover:bg-sky-50 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add stock"}
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
