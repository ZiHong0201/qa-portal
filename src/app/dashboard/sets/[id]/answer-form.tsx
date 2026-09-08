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
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <div className="flex flex-col gap-2">
        {choices.map((c) => (
          <label
            key={c.id}
            className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 hover:bg-gray-50"
          >
            <input type="radio" name="choiceId" value={c.id} required />
            {c.text}
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Submitting..." : "Submit answer"}
      </button>
    </form>
  );
}
