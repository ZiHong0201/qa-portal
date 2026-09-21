"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/lib/actions/auth";
import { PetCat, clothingKeys } from "@/components/pet-cat";

type Initial = {
  name: string;
  kind: "CLOTHING" | "FOOD" | "SNACK";
  key: string;
  cost: number;
  hungerEffect: number;
  happinessEffect: number;
  sortOrder: number;
  isActive: boolean;
};

const GARMENTS = clothingKeys();

export function PetItemForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Initial;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  // State-backed throughout: React resets a form once its action returns, so
  // anything uncontrolled would be wiped by a rejected submission.
  const [kind, setKind] = useState<Initial["kind"]>(initial?.kind ?? "FOOD");
  const [key, setKey] = useState(initial?.key ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [cost, setCost] = useState(String(initial?.cost ?? 10));
  const [hunger, setHunger] = useState(String(initial?.hungerEffect ?? 20));
  const [happiness, setHappiness] = useState(String(initial?.happinessEffect ?? 5));
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const isClothing = kind === "CLOTHING";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="kind">
          Type
        </label>
        <select
          id="kind"
          name="kind"
          value={kind}
          onChange={(e) => {
            const next = e.target.value as Initial["kind"];
            setKind(next);
            // The key means different things per type, so clear it on switch
            // rather than leaving a garment name on a bowl of food.
            setKey("");
          }}
          className="rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="FOOD">Food — fills hunger</option>
          <option value="SNACK">Snack — mostly happiness</option>
          <option value="CLOTHING">Clothing — kept and worn</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isClothing ? "e.g. Party hat" : "e.g. Bowl of kibble"}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      {isClothing ? (
        <div>
          <span className="mb-1 block text-sm font-medium">Artwork</span>
          <p className="mb-2 text-xs text-gray-500">
            Pick the garment the cat will wear. Only these can be drawn — more can be added in
            code later.
          </p>
          <div className="flex flex-wrap gap-2">
            {GARMENTS.map((g) => (
              <label
                key={g}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 p-2 transition-colors ${
                  key === g ? "border-sky-400 bg-sky-50" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="key"
                  value={g}
                  checked={key === g}
                  onChange={() => setKey(g)}
                  className="sr-only"
                />
                <PetCat coat="grey" equipped={[g]} className="h-16 w-16" />
                <span className="text-[11px] text-gray-600">{g}</span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="key">
            Reference
          </label>
          <input
            id="key"
            name="key"
            required
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="e.g. food-kibble"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            A unique identifier. Not shown to students.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="cost">
            Cost (points)
          </label>
          <input
            id="cost"
            name="cost"
            type="number"
            min={0}
            required
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-32 rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        {!isClothing && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="hungerEffect">
                + Hunger
              </label>
              <input
                id="hungerEffect"
                name="hungerEffect"
                type="number"
                min={0}
                max={100}
                value={hunger}
                onChange={(e) => setHunger(e.target.value)}
                className="w-28 rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="happinessEffect">
                + Happiness
              </label>
              <input
                id="happinessEffect"
                name="happinessEffect"
                type="number"
                min={0}
                max={100}
                value={happiness}
                onChange={(e) => setHappiness(e.target.value)}
                className="w-28 rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="sortOrder">
            Order
          </label>
          <input
            id="sortOrder"
            name="sortOrder"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-24 rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          value="true"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4"
        />
        Show in the shop
      </label>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 disabled:opacity-50"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
