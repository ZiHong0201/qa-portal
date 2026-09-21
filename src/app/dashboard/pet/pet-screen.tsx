"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { PetCat } from "@/components/pet-cat";
import { PetTreat } from "@/components/pet-treat";
import { buyPetItem, togglePetItem, pettingSession } from "@/lib/actions/pet";
import {
  statColor,
  HUNGER_DECAY_PER_HOUR,
  HAPPINESS_DECAY_PER_HOUR,
  hoursUntilEmpty,
  describeTimeLeft,
} from "@/lib/pet";
import type { PetView, ShopItem } from "@/lib/pet.server";

function StatBar({ label, value, perHour }: { label: string; value: number; perHour: number }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500">{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${statColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-gray-400">
        {value === 0 ? "empty" : `empty in ${describeTimeLeft(hoursUntilEmpty(value, perHour))}`}
      </p>
    </div>
  );
}

const TABS = [
  { key: "FOOD", label: "Food" },
  { key: "SNACK", label: "Snacks" },
  { key: "CLOTHING", label: "Clothes" },
] as const;

export function PetScreen({ pet, balance }: { pet: PetView; balance: number }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("FOOD");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Optimistic preview: hovering a hat in the shop shows it on the cat before
  // any points are spent, which is most of the fun of buying one.
  const [preview, setPreview] = useState<string | null>(null);

  // A one-shot overlay above the cat: the treat it was just given, or a puff
  // of hearts from a fuss. The counter is part of the key so giving the same
  // treat twice restarts the animation instead of React reusing the element
  // and leaving it frozen at its end state.
  const [effect, setEffect] = useState<{ kind: "treat" | "fuss"; key: string; n: number } | null>(
    null
  );
  const effectCount = useRef(0);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showEffect(kind: "treat" | "fuss", key = "") {
    effectCount.current += 1;
    setEffect({ kind, key, n: effectCount.current });
    if (clearTimer.current) clearTimeout(clearTimer.current);
    // Slightly longer than the CSS, so the element is removed after it has
    // faded rather than vanishing mid-animation.
    clearTimer.current = setTimeout(() => setEffect(null), 1800);
  }

  // A pending timer holding a reference to setEffect would fire after the
  // screen has gone if the student navigates away mid-animation.
  useEffect(() => () => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
  }, []);

  function run(
    action: () => Promise<{ error?: string; success?: string }>,
    onSuccess?: () => void
  ) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      if (result.success) {
        setMessage(result.success);
        onSuccess?.();
      }
    });
  }

  const shown = pet.shop.filter((i) => i.kind === tab);
  const wardrobe = pet.shop.filter((i) => i.kind === "CLOTHING" && i.owned);

  // A previewed hat replaces whatever is in the same slot, so the cat never
  // wears two at once.
  const previewItem = preview ? pet.shop.find((i) => i.key === preview) : null;
  const equipped = previewItem
    ? [
        ...pet.equippedKeys.filter(
          (k) => pet.shop.find((i) => i.key === k)?.slot !== previewItem.slot
        ),
        previewItem.key,
      ]
    : pet.equippedKeys;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold text-sky-950">{pet.name}</h1>
        <span className="shrink-0 rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
          {balance.toLocaleString()}
          <span className="ml-1 text-xs font-normal text-sky-500">pts</span>
        </span>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50 to-white p-6 shadow-sm">
        <div className="flex flex-col items-center">
          <div className="relative">
            <PetCat coat={pet.coat} equipped={equipped} mood={pet.mood.key} className="h-44 w-44" />

            {effect?.kind === "treat" && (
              <div
                key={effect.n}
                className="animate-treat-nom pointer-events-none absolute inset-x-0 bottom-1 flex justify-center"
              >
                <PetTreat treatKey={effect.key} className="h-16 w-16 drop-shadow" />
              </div>
            )}

            {effect?.kind === "fuss" && (
              <div key={effect.n} className="pointer-events-none absolute inset-0">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="animate-fuss-heart absolute top-6 left-1/2 text-lg text-rose-400"
                    style={{
                      animationDelay: `${i * 0.18}s`,
                      ["--drift" as string]: `${(i - 1) * 22}px`,
                    }}
                  >
                    &#10084;
                  </span>
                ))}
              </div>
            )}
          </div>
          <p className="mt-2 text-sm font-medium text-sky-900">{pet.mood.label}</p>
          <p className="text-xs text-gray-500">{pet.mood.line}</p>

          <button
            type="button"
            onClick={() => run(pettingSession, () => showEffect("fuss"))}
            disabled={pending}
            className="mt-3 rounded-full border border-sky-200 px-4 py-1.5 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-50 disabled:opacity-50"
          >
            Give a fuss (free)
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <StatBar label="Hunger" value={pet.stats.hunger} perHour={HUNGER_DECAY_PER_HOUR} />
          <StatBar label="Happiness" value={pet.stats.happiness} perHour={HAPPINESS_DECAY_PER_HOUR} />
        </div>
      </div>

      {(message || error) && (
        <p
          className={`mt-4 rounded-xl px-4 py-2.5 text-sm ${
            error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {error ?? message}
        </p>
      )}

      {wardrobe.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">
            Wardrobe
          </h2>
          <div className="flex flex-wrap gap-2">
            {wardrobe.map((item) => (
              <WardrobeChip
                key={item.id}
                item={item}
                pending={pending}
                onToggle={() => run(() => togglePetItem(item.id))}
                onPreview={setPreview}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <div className="mb-3 flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "border-sky-300 bg-sky-100 text-sky-800"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            Nothing in this section yet.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {shown.map((item) => (
              <ShopRow
                key={item.id}
                item={item}
                balance={balance}
                pending={pending}
                onBuy={() =>
                  run(
                    () => buyPetItem(item.id),
                    () => item.kind !== "CLOTHING" && showEffect("treat", item.key)
                  )
                }
                onPreview={setPreview}
              />
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-center text-xs text-gray-400">
        Food and clothes come out of the same points you spend in the catalogue.
      </p>
    </div>
  );
}

function WardrobeChip({
  item,
  pending,
  onToggle,
  onPreview,
}: {
  item: ShopItem;
  pending: boolean;
  onToggle: () => void;
  onPreview: (key: string | null) => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      onMouseEnter={() => !item.equipped && onPreview(item.key)}
      onMouseLeave={() => onPreview(null)}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
        item.equipped
          ? "border-sky-400 bg-sky-100 font-medium text-sky-800"
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {item.name}
      {item.equipped && <span className="ml-1.5 text-xs text-sky-500">worn</span>}
    </button>
  );
}

function ShopRow({
  item,
  balance,
  pending,
  onBuy,
  onPreview,
}: {
  item: ShopItem;
  balance: number;
  pending: boolean;
  onBuy: () => void;
  onPreview: (key: string | null) => void;
}) {
  const affordable = balance >= item.cost;
  const isClothing = item.kind === "CLOTHING";

  return (
    <li
      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3"
      onMouseEnter={() => isClothing && !item.owned && onPreview(item.key)}
      onMouseLeave={() => onPreview(null)}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
        <p className="text-xs text-gray-500">
          {isClothing
            ? item.owned
              ? "In your wardrobe"
              : "Worn straight away"
            : [
                item.hungerEffect > 0 ? `+${item.hungerEffect} hunger` : null,
                item.happinessEffect > 0 ? `+${item.happinessEffect} happiness` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
        </p>
      </div>

      {item.owned && isClothing ? (
        <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
          Owned
        </span>
      ) : (
        <button
          type="button"
          onClick={onBuy}
          disabled={pending || !affordable}
          title={affordable ? undefined : "Not enough points"}
          className="shrink-0 rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {item.cost} pts
        </button>
      )}
    </li>
  );
}
