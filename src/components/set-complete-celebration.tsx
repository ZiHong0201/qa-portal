"use client";

import { useEffect, useState } from "react";
import { CelebratingCat } from "./celebrating-cat";

const CONFETTI_COLORS = ["#38bdf8", "#facc15", "#34d399", "#fb7185", "#a78bfa", "#fb923c"];

type ConfettiPiece = {
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  round: boolean;
};

function makeConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.9,
    duration: 1.9 + Math.random() * 1.4,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 7 + Math.random() * 6,
    round: Math.random() > 0.6,
  }));
}

// Grading bands, so the message matches how the student actually did instead of
// cheering identically for 10% and 100%.
function praise(pct: number) {
  if (pct === 100) return "Perfect score! Every single one correct.";
  if (pct >= 80) return "Brilliant work — that's a strong result.";
  if (pct >= 50) return "Nice going! Review the ones you missed and you'll climb higher.";
  return "Set finished! Go over the answers you missed — that's where the marks are.";
}

export function SetCompleteCelebration({
  marksObtained,
  totalMarks,
  onClose,
}: {
  marksObtained: number;
  totalMarks: number;
  onClose: () => void;
}) {
  // Generated once so re-renders don't reshuffle confetti mid-fall.
  const [confetti] = useState(() => makeConfetti(34));

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const pct = totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 100) : 0;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Set complete"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-sky-950/40"
      />

      {/* Confetti sits above the backdrop but below the card, and ignores
          pointer events so it never swallows the dismiss click. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((p, i) => (
          <span
            key={i}
            className="animate-confetti absolute top-0 block"
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size * (p.round ? 1 : 1.6)}px`,
              backgroundColor: p.color,
              borderRadius: p.round ? "9999px" : "2px",
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="animate-pop-in relative w-full max-w-sm rounded-3xl border border-sky-100 bg-white p-6 text-center shadow-2xl">
        <div className="mb-2 flex justify-center">
          <CelebratingCat size="h-28 w-28" sparkleSize="text-2xl" />
        </div>

        <h2 className="text-2xl font-bold text-sky-950">Set complete!</h2>
        <p className="mt-1 text-sm text-gray-500">{praise(pct)}</p>

        <div className="mt-4 rounded-2xl bg-sky-50 px-4 py-3">
          <p className="text-3xl font-bold text-sky-700">
            {marksObtained}
            <span className="text-lg font-medium text-sky-400"> / {totalMarks}</span>
          </p>
          <p className="text-xs font-medium tracking-wide text-sky-500 uppercase">marks · {pct}%</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="mt-5 w-full rounded-xl bg-sky-600 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-sky-700 active:scale-[0.98]"
        >
          Nice!
        </button>
      </div>
    </div>
  );
}
