"use client";

import { useActionState } from "react";
import { redeemCatalogueItem } from "@/lib/actions/catalogue";

export function RedeemButton({ itemId, canAfford }: { itemId: string; canAfford: boolean }) {
  const [state, formAction, pending] = useActionState(redeemCatalogueItem.bind(null, itemId), {});

  if (state.success) {
    return <p className="text-sm font-medium text-green-700">{state.success}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-1">
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || !canAfford}
        className="self-start rounded-md bg-black px-3 py-1.5 text-sm text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Redeeming..." : canAfford ? "Redeem" : "Not enough points"}
      </button>
    </form>
  );
}
