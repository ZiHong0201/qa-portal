"use client";

import { PetArt } from "@/components/pet-art";
import { usePetLook } from "@/components/pet-look";

import { useState } from "react";
import { useQuestionHint } from "./question-hint-context";
import { useUiLang } from "@/components/ui-language";
import { homeText } from "@/lib/text/home";

function pickIndex(poolLength: number, exclude?: number) {
  if (poolLength <= 1) return 0;
  let i = Math.floor(Math.random() * poolLength);
  while (i === exclude) i = Math.floor(Math.random() * poolLength);
  return i;
}

/**
 * The student's own pet in the corner of every page, handing out study tips -
 * or, on a question, that question's hints.
 */
export function PetCompanion() {
  const t = homeText[useUiLang()];
  const { hint } = useQuestionHint();
  const isQuestionHint = !!hint && hint.hints.length > 0;
  // The question's own hints stay as the teacher wrote them; only the general
  // tips follow the portal language.
  const pool = isQuestionHint ? hint.hints : t.tips;

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
                {isQuestionHint ? t.hintForQuestion : t.studyTip}
              </p>
              <p className="text-sm text-gray-700">{pool[tipIndex]}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.close}
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
              {isQuestionHint ? t.otherHint : t.anotherTip}
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-label={open ? t.hideStudyBuddy : t.getStudyTip}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 shadow-md ring-2 ring-white transition-transform hover:scale-105 active:scale-95"
      >
        <PetFace />
      </button>
    </div>
  );
}

// The floating button is 44px, so this is the face crop rather than the whole
// pet: at that size a whole pet is an unreadable smudge.
function PetFace() {
  return <PetArt look={usePetLook()} face className="h-11 w-11" />;
}
