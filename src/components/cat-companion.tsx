"use client";

import { PetPic } from "@/components/pet-pic";

import { useState } from "react";
import { useQuestionHint } from "./question-hint-context";

const TIPS = [
  "Read the question twice before choosing an answer!",
  "Eliminate the options you're sure are wrong first — it's easier from there.",
  "Stuck on one? Skip it and come back later with fresh eyes.",
  "Diagrams often hold the key — look closely before answering!",
  "Watch for words like \"NOT\" or \"EXCEPT\" — they flip the whole question.",
  "Double-check units — they're a classic trap in Physics questions.",
  "A confident guess beats a blank answer. You've got this!",
  "Take a deep breath. One question at a time.",
  "After finishing a set, review what you got wrong — that's where the real learning happens.",
  "Break big topics into small chunks instead of cramming it all at once.",
  "If two options look almost identical, the difference between them is usually the trick.",
  "Say the question out loud in your head — it helps catch details you might skim past.",
  "You don't have to be fast. Being careful matters more.",
  "Come back to flashcards you got wrong tomorrow — repetition is how it sticks.",
  "Proud of you for practicing. Keep going!",
];

function pickIndex(poolLength: number, exclude?: number) {
  if (poolLength <= 1) return 0;
  let i = Math.floor(Math.random() * poolLength);
  while (i === exclude) i = Math.floor(Math.random() * poolLength);
  return i;
}

export function CatCompanion() {
  const { hint } = useQuestionHint();
  const isQuestionHint = !!hint && hint.hints.length > 0;
  const pool = isQuestionHint ? hint.hints : TIPS;

  const [open, setOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState<number | null>(null);

  const [lastQuestionId, setLastQuestionId] = useState(hint?.questionId);
  if (hint?.questionId !== lastQuestionId) {
    setLastQuestionId(hint?.questionId);
    setOpen(false);
    setTipIndex(null);
  }

  function toggle() {
    if (!open) setTipIndex(pickIndex(pool.length));
    setOpen((o) => !o);
  }

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2">
      {open && tipIndex !== null && (
        <div className="w-64 rounded-2xl rounded-br-sm border border-sky-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <p className="mb-1 text-xs font-semibold text-sky-500">
                {isQuestionHint ? "Hint for this question" : "Study tip"}
              </p>
              <p className="text-sm text-gray-700">{pool[tipIndex]}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="shrink-0 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          {pool.length > 1 && (
            <button
              type="button"
              onClick={() => setTipIndex((i) => pickIndex(pool.length, i ?? undefined))}
              className="text-xs font-medium text-sky-600 hover:text-sky-800 hover:underline"
            >
              {isQuestionHint ? "Other hint →" : "Another tip →"}
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "Hide study buddy" : "Get a study tip"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 shadow-md ring-2 ring-white transition-transform hover:scale-105 active:scale-95"
      >
        <CatFace />
      </button>
    </div>
  );
}

// The floating button is 44px, so this is the face crop rather than the whole
// cat - see prepare-pet-face.mjs for why.
function CatFace() {
  return <PetPic face className="h-11 w-11 object-contain" />;
}
