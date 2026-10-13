"use client";

import { useEffect, useState } from "react";
import { getAnswerBreakdown, type AnswerBreakdown } from "@/lib/actions/live";
import { CHOICE_STYLES, type LiveChoice } from "@/lib/live";

const SHOW_KEY = "live:showNames";

/**
 * Who chose which option, by name - on the host screen once a question has
 * been revealed.
 *
 * Off until the host turns it on, and remembered after that. The host screen
 * is usually the projector, and a hall of a hundred reading which named
 * classmates got it wrong is a different thing from the host checking at
 * their own desk. One click either way.
 */
export function AnswerBreakdownPanel({
  quizId,
  index,
  choices,
  correctChoiceId,
}: {
  quizId: string;
  index: number;
  choices: LiveChoice[];
  correctChoiceId: string | null;
}) {
  const [show, setShow] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(SHOW_KEY) === "1";
    } catch {
      return false;
    }
  });
  // Keyed by question, so moving on never shows the last question's names.
  const [data, setData] = useState<{ index: number; breakdown: AnswerBreakdown } | null>(null);

  useEffect(() => {
    if (!show || data?.index === index) return;
    let cancelled = false;
    void getAnswerBreakdown(quizId, index).then((breakdown) => {
      if (!cancelled) setData({ index, breakdown });
    });
    return () => {
      cancelled = true;
    };
  }, [show, quizId, index, data?.index]);

  const toggle = () => {
    const next = !show;
    setShow(next);
    try {
      localStorage.setItem(SHOW_KEY, next ? "1" : "0");
    } catch {
      /* the toggle still works for this page */
    }
  };

  const breakdown = data?.index === index ? data.breakdown : null;

  return (
    <div>
      <button
        onClick={toggle}
        className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/80 hover:bg-white/20"
      >
        {show ? "Hide who answered what" : "Show who answered what"}
      </button>

      {show && !breakdown && <p className="mt-3 text-sm text-white/60">Loading…</p>}

      {show && breakdown && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {choices.map((c, i) => {
            const style = CHOICE_STYLES[i % CHOICE_STYLES.length];
            const people = breakdown.byChoice[c.id] ?? [];
            const right = c.id === correctChoiceId;
            return (
              <div
                key={c.id}
                className={`rounded-xl bg-white/10 p-3 ${right ? "ring-2 ring-emerald-300" : ""}`}
              >
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <span className={`flex h-6 w-6 items-center justify-center rounded ${style.bg}`}>
                    {right ? "✓" : style.letter}
                  </span>
                  {people.length} {people.length === 1 ? "player" : "players"}
                </p>
                <Names names={people.map((p) => p.name)} />
              </div>
            );
          })}
          {breakdown.unanswered.length > 0 && (
            <div className="rounded-xl bg-white/5 p-3">
              <p className="mb-2 text-sm font-semibold text-white/70">
                No answer · {breakdown.unanswered.length}
              </p>
              <Names names={breakdown.unanswered.map((p) => p.name)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Names({ names }: { names: string[] }) {
  if (names.length === 0) return <p className="text-xs text-white/40">Nobody</p>;
  return (
    // Scrolls rather than grows: a hundred names under one option would
    // otherwise push the Next button off the bottom of the screen.
    <ul className="flex max-h-40 flex-wrap gap-1 overflow-y-auto">
      {names.map((n, i) => (
        <li key={`${n}-${i}`} className="rounded-full bg-white/15 px-2 py-0.5 text-xs">
          {n}
        </li>
      ))}
    </ul>
  );
}
