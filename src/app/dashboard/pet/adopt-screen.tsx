"use client";

import { useActionState, useState } from "react";
import { adoptPet } from "@/lib/actions/pet";
import { COATS, PET_NAME_MAX_LENGTH } from "@/lib/pet";
import { PetSprite } from "@/components/pet-sprite";

export function AdoptScreen() {
  const [state, formAction, pending] = useActionState(adoptPet, {});
  const [coat, setCoat] = useState(COATS[0].key);
  const [name, setName] = useState("");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-2xl font-bold text-sky-950">Adopt a cat</h1>
      <p className="mb-6 text-sm text-gray-500">
        Yours to look after. Feeding and dressing it costs the same points you spend in the
        catalogue, so treats and rewards come out of one pot.
      </p>

      <form action={formAction} className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
        {state.error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}

        {/* Live preview, so the choice is made by looking rather than reading. */}
        <div className="mb-5 flex justify-center">
          <PetSprite coat={coat} mood="happy" priority className="h-40 w-40 object-contain" />
        </div>

        <fieldset className="mb-5">
          <legend className="mb-2 block text-sm font-medium">Colour</legend>
          <div className="flex flex-wrap justify-center gap-3">
            {COATS.map((c) => (
              <label
                key={c.key}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-3 py-2 transition-colors ${
                  coat === c.key ? "border-sky-400 bg-sky-50" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="coat"
                  value={c.key}
                  checked={coat === c.key}
                  onChange={() => setCoat(c.key)}
                  className="sr-only"
                />
                <span
                  className="h-8 w-8 rounded-full border-2"
                  style={{ backgroundColor: c.fur, borderColor: c.stroke }}
                />
                <span className="text-xs text-gray-600">{c.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mb-5">
          <label className="mb-1 block text-sm font-medium" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={PET_NAME_MAX_LENGTH}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mochi"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-3 font-semibold text-white shadow transition-all hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50"
        >
          {pending ? "Adopting…" : "Adopt"}
        </button>
        <p className="mt-2 text-center text-xs text-gray-400">Adopting is free.</p>
      </form>
    </div>
  );
}
