"use client";

import { useActionState } from "react";
import { submitAnswer } from "@/lib/actions/submissions";

type Choice = { id: string; text: string };

export function AnswerForm({
  questionId,
  choices,
}: {
  questionId: string;
  choices: Choice[];
}) {
  const action = submitAnswer.bind(null, questionId);
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
      )}
      <div className="flex flex-col gap-2">
        {choices.map((c) => (
          <label
            key={c.id}
            className="flex items-center gap-2 rounded-lg border border-sky-100 px-3 py-2.5 transition-colors hover:border-sky-300 hover:bg-sky-50"
          >
            <input type="radio" name="choiceId" value={c.id} required className="accent-sky-600" />
            {c.text}
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-sky-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
      >
        {pending ? "Submitting..." : "Submit answer"}
      </button>
    </form>
  );
}
