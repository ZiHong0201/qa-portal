"use client";

import { useActionState } from "react";
import { hatchPet } from "@/lib/actions/study-pet";
import { PET_NAME_MAX_LENGTH } from "@/lib/study-pet";
import { petText as t } from "@/lib/text/pet";

/** Naming the egg is what hatches it. */
export function HatchForm() {
  const [state, formAction, pending] = useActionState(hatchPet, {});

  return (
    <form action={formAction} className="mx-auto mt-4 flex max-w-xs flex-col gap-2 text-left">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <label className="text-sm font-medium text-sky-950" htmlFor="pet-name">
        {t.name}
      </label>
      <input
        id="pet-name"
        name="name"
        required
        maxLength={PET_NAME_MAX_LENGTH}
        placeholder={t.namePlaceholder}
        autoComplete="off"
        className="w-full rounded-md border border-gray-300 px-3 py-2"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 font-semibold text-white shadow transition-all hover:from-amber-400 hover:to-orange-400 disabled:opacity-50"
      >
        {pending ? t.hatching : t.hatch}
      </button>
    </form>
  );
}
