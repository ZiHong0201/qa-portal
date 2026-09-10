"use client";

import { useState } from "react";

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

function pickTip(exclude?: number) {
  if (TIPS.length <= 1) return 0;
  let i = Math.floor(Math.random() * TIPS.length);
  while (i === exclude) i = Math.floor(Math.random() * TIPS.length);
  return i;
}

export function CatCompanion() {
  const [open, setOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState<number | null>(null);

  function toggle() {
    if (!open) setTipIndex(pickTip());
    setOpen((o) => !o);
  }

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2">
      {open && tipIndex !== null && (
        <div className="w-64 rounded-2xl rounded-br-sm border border-sky-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="text-sm text-gray-700">{TIPS[tipIndex]}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="shrink-0 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <button
            type="button"
            onClick={() => setTipIndex((i) => pickTip(i ?? undefined))}
            className="text-xs font-medium text-sky-600 hover:text-sky-800 hover:underline"
          >
            Another tip →
          </button>
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

function CatFace() {
  return (
    <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
      {/* ears */}
      <path d="M14 22 L20 6 L28 20 Z" fill="#8f8983" stroke="#4a4540" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M50 22 L44 6 L36 20 Z" fill="#8f8983" stroke="#4a4540" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M17 19 L20 11 L24 18 Z" fill="#d9b3ae" />
      <path d="M47 19 L44 11 L40 18 Z" fill="#d9b3ae" />
      {/* face */}
      <circle cx="32" cy="34" r="20" fill="#8f8983" stroke="#4a4540" strokeWidth="1.5" />
      {/* muzzle patch */}
      <ellipse cx="32" cy="42" rx="11" ry="8" fill="#ffffff" />
      {/* eyes */}
      <circle cx="24" cy="33" r="3.4" fill="#82b24c" />
      <circle cx="40" cy="33" r="3.4" fill="#82b24c" />
      <circle cx="25.2" cy="31.8" r="1" fill="#fff" />
      <circle cx="41.2" cy="31.8" r="1" fill="#fff" />
      {/* blush */}
      <ellipse cx="18" cy="39" rx="3" ry="2" fill="#f3b6c4" opacity="0.7" />
      <ellipse cx="46" cy="39" rx="3" ry="2" fill="#f3b6c4" opacity="0.7" />
      {/* nose + mouth */}
      <path d="M30.5 39 L33.5 39 L32 41 Z" fill="#4a4540" />
      <path d="M32 41 Q32 44 28 44" fill="none" stroke="#4a4540" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M32 41 Q32 44 36 44" fill="none" stroke="#4a4540" strokeWidth="1.3" strokeLinecap="round" />
      {/* whiskers */}
      <path d="M8 32 L18 33" stroke="#4a4540" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8 37 L18 36" stroke="#4a4540" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M56 32 L46 33" stroke="#4a4540" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M56 37 L46 36" stroke="#4a4540" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
