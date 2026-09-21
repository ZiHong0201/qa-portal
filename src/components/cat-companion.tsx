"use client";

import { coatOf } from "@/lib/pet";
import { usePetAppearance } from "@/components/pet-appearance";

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

// Same cat as CelebratingCat / CatWink, framed as a head-and-ears portrait so
// it still reads at the 44px the floating button gives it.
function CatFace() {
  // Colour only: framed as a head-and-ears portrait on its own proportions, so
  // garments from the 100x100 grid would not line up. Takes the adopted coat.
  const { fur, stroke } = coatOf(usePetAppearance()?.coat ?? "grey");

  return (
    <svg viewBox="0 0 100 100" width="44" height="44" aria-hidden="true">
      {/* ears, drawn before the head so their bases stay hidden */}
      <path
        d="M25 40 L15 11 L47 29 Z"
        fill={fur}
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M75 40 L85 11 L53 29 Z"
        fill={fur}
        stroke={stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M26 33 L21 18 L39 29 Z" fill="#d9b3ae" />
      <path d="M74 33 L79 18 L61 29 Z" fill="#d9b3ae" />
      {/* head */}
      <circle cx="50" cy="58" r="33" fill={fur} stroke={stroke} strokeWidth="3" />
      {/* muzzle */}
      <ellipse cx="50" cy="74.7" rx="18" ry="11.8" fill="#ffffff" />
      {/* eyes */}
      <circle cx="36.1" cy="56.6" r="7.8" fill="#82b24c" stroke={stroke} strokeWidth="2" />
      <circle cx="63.9" cy="56.6" r="7.8" fill="#82b24c" stroke={stroke} strokeWidth="2" />
      <ellipse cx="36.1" cy="56.6" rx="3.2" ry="5.8" fill="#2f2b27" />
      <ellipse cx="63.9" cy="56.6" rx="3.2" ry="5.8" fill="#2f2b27" />
      <circle cx="33.6" cy="53.3" r="2.2" fill="#ffffff" />
      <circle cx="61.4" cy="53.3" r="2.2" fill="#ffffff" />
      {/* blush */}
      <ellipse cx="23.6" cy="69.1" rx="5.6" ry="3.6" fill="#f3b6c4" opacity="0.65" />
      <ellipse cx="76.4" cy="69.1" rx="5.6" ry="3.6" fill="#f3b6c4" opacity="0.65" />
      {/* nose */}
      <path d="M45.3 68.4 Q50 65.5 54.7 68.4 Q50 74.7 45.3 68.4 Z" fill="#d98b93" />
      {/* mouth */}
      <path
        d="M50 73.9 Q43.9 80.8 38.3 75.6"
        fill="none"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M50 73.9 Q56.1 80.8 61.7 75.6"
        fill="none"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* whiskers */}
      <path
        d="M31.9 67.6 Q22.2 64.3 15.2 62.2"
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.65"
      />
      <path
        d="M31.9 73.3 Q21.5 73.3 13.8 74"
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.65"
      />
      <path
        d="M68.1 67.6 Q77.8 64.3 84.8 62.2"
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.65"
      />
      <path
        d="M68.1 73.3 Q78.5 73.3 86.2 74"
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.65"
      />
    </svg>
  );
}
