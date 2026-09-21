"use client";

import { useActionState, useEffect } from "react";
import { submitAnswer, type SubmitAnswerState } from "@/lib/actions/submissions";
import { useIntegrityTracker, blockingHandlers } from "@/lib/integrity";

type Choice = { id: string; text: string };

export function AnswerForm({
  questionId,
  choices,
  onSubmitted,
  onPendingChange,
}: {
  questionId: string;
  choices: Choice[];
  onSubmitted: (result: NonNullable<SubmitAnswerState["result"]>) => void;
  /**
   * Reports whether a submission is in flight. The deck uses it to hold the
   * navigation buttons: this form reports its result through an effect, so
   * unmounting it mid-request (by moving to another card) loses the result
   * even though the server has already recorded the answer.
   */
  onPendingChange?: (pending: boolean) => void;
}) {
  const action = submitAnswer.bind(null, questionId);
  const [state, formAction, pending] = useActionState(action, {});
  const { read, countPaste } = useIntegrityTracker(questionId);

  useEffect(() => {
    if (state.result) onSubmitted(state.result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    onPendingChange?.(pending);
    return () => onPendingChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  return (
    <form
      action={(formData) => {
        // Read the signals at submit time and send them with the answer, so
        // the server never has to trust a separate request to arrive.
        const signals = read();
        formData.set("secondsTaken", String(signals.secondsTaken));
        formData.set("awayCount", String(signals.awayCount));
        formData.set("awaySeconds", String(signals.awaySeconds));
        formData.set("pasteAttempts", String(signals.pasteAttempts));
        formAction(formData);
      }}
      className="flex flex-col gap-3"
      {...blockingHandlers(countPaste)}
    >
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
