"use client";

import { useActionState, useState } from "react";
import { chooseElement } from "@/lib/actions/study-pet";
import { ELEMENTS, type Element } from "@/lib/study-pet";
import { petText as t } from "@/lib/text/pet";
import { PetArt } from "@/components/pet-art";

/** The five eggs. Picking one is permanent, so it takes a second, explicit tap. */
export function EggPicker() {
  const [state, formAction, pending] = useActionState(chooseElement, {});
  const [picked, setPicked] = useState<Element | null>(null);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-sky-950">{t.pickTitle}</h1>
      <p className="mb-6 text-sm text-gray-500">{t.pickIntro}</p>

      <form action={formAction} className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        {state.error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <fieldset>
          <legend className="sr-only">{t.pickTitle}</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {ELEMENTS.map((element) => {
              const info = t.elements[element];
              const selected = picked === element;
              return (
                <label
                  key={element}
                  className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 p-2 text-center transition-all ${
                    selected
                      ? "border-sky-400 bg-sky-50 shadow-md"
                      : "border-gray-100 hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50/50"
                  } has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sky-400`}
                >
                  <input
                    type="radio"
                    name="element"
                    value={element}
                    checked={selected}
                    onChange={() => setPicked(element)}
                    className="sr-only"
                  />
                  <PetArt
                    look={{ element, stage: "egg", rare: false, mood: "content" }}
                    warmth={selected ? 1 : 0}
                    className="h-24 w-24"
                  />
                  <span className="mt-1 font-semibold text-sky-950">{info.name}</span>
                  <span className="mt-0.5 text-xs leading-snug text-gray-500">{info.blurb}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-5 flex flex-col items-center gap-1">
          <button
            type="submit"
            disabled={!picked || pending}
            className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-3 font-semibold text-white shadow transition-all hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50"
          >
            {pending ? t.picking : picked ? t.pickConfirm(t.elements[picked].name) : t.pickPrompt}
          </button>
          {picked && <p className="text-xs text-gray-500">{t.pickWarning}</p>}
        </div>
      </form>
    </div>
  );
}
