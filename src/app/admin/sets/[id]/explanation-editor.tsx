"use client";

import { useState } from "react";
import { updateQuestionExplanation } from "@/lib/actions/questions";
import { SubmitButton } from "@/components/submit-button";

export function ExplanationEditor({
  questionId,
  initialExplanation,
}: {
  questionId: string;
  initialExplanation: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left text-sm text-blue-600 hover:underline"
      >
        {initialExplanation ? "Edit explanation" : "+ Add explanation"}
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await updateQuestionExplanation(questionId, formData);
        setOpen(false);
      }}
      className="flex flex-col gap-2"
    >
      <textarea
        name="explanation"
        rows={2}
        defaultValue={initialExplanation ?? ""}
        placeholder="Shown to students if they answer incorrectly, along with the correct answer."
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        autoFocus
      />
      <div className="flex gap-2">
        <SubmitButton
          pendingText="Saving…"
          className="rounded-md bg-black px-3 py-1.5 text-sm text-white hover:bg-gray-800"
        >
          Save
        </SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
