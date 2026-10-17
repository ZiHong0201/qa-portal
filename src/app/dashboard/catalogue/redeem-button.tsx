"use client";

import { useActionState } from "react";
import { redeemCatalogueItem } from "@/lib/actions/catalogue";

export function RedeemButton({
  itemId,
  canAfford,
  blocked,
}: {
  itemId: string;
  canAfford: boolean;
  /** Why it cannot be exchanged right now, if it cannot - out of stock, limit reached. */
  blocked: string | null;
}) {
  const [state, formAction, pending] = useActionState(redeemCatalogueItem.bind(null, itemId), {});

  if (state.success) {
    return <p className="max-w-[14rem] text-sm font-medium text-green-700">{state.success}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-1">
      {state.error && <p className="max-w-[14rem] text-xs text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || !canAfford || !!blocked}
        className="self-start rounded-md bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Exchanging..." : blocked ?? (canAfford ? "Exchange" : "Not enough points")}
      </button>
    </form>
  );
}
