"use client";

import { useActionState, useState } from "react";
import { createLiveQuiz } from "@/lib/actions/live";
import { SECONDS_CHOICES } from "@/lib/live";

type PlayableSet = { id: string; title: string; subject: string; count: number };

/**
 * Every field is held in state rather than left to the browser: React resets
 * an uncontrolled form after its action runs, so a validation error would
 * otherwise come back with the set, timer and count all wiped.
 */
export function NewLiveQuizForm({ sets }: { sets: PlayableSet[] }) {
  const [state, action, pending] = useActionState(createLiveQuiz, {});
  const [setId, setSetId] = useState(sets[0]?.id ?? "");
  const [seconds, setSeconds] = useState(20);
  const [count, setCount] = useState(10);
  const [shuffle, setShuffle] = useState(true);

  if (sets.length === 0) {
    return <p className="text-sm text-gray-500">No question set has multiple-choice questions yet.</p>;
  }

  const chosen = sets.find((s) => s.id === setId);
  const max = chosen?.count ?? 1;
  const n = Math.min(count, max);
  const subjects = [...new Set(sets.map((s) => s.subject))];

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium">
        Question set
        <select
          name="questionSetId"
          value={setId}
          onChange={(e) => setSetId(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 font-normal"
        >
          {subjects.map((subject) => (
            <optgroup key={subject} label={subject}>
              {sets
                .filter((s) => s.subject === subject)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.count})
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Time per question
          <select
            name="seconds"
            value={seconds}
            onChange={(e) => setSeconds(Number(e.target.value))}
            className="rounded-md border border-gray-300 px-3 py-2 font-normal"
          >
            {SECONDS_CHOICES.map((s) => (
              <option key={s} value={s}>
                {s} seconds
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Questions
          <input
            type="number"
            name="count"
            min={1}
            max={max}
            value={n}
            onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
            className="w-28 rounded-md border border-gray-300 px-3 py-2 font-normal"
          />
          <span className="text-xs font-normal text-gray-500">of {max} in this set</span>
        </label>

        <label className="flex items-center gap-2 self-center text-sm">
          <input
            type="checkbox"
            name="shuffle"
            checked={shuffle}
            onChange={(e) => setShuffle(e.target.checked)}
          />
          Shuffle the questions
        </label>
      </div>

      <p className="text-xs text-gray-500">
        About {Math.ceil((n * (seconds + 15)) / 60)} minutes, allowing time to show each answer.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create game"}
      </button>
    </form>
  );
}
