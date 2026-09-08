"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions/auth";

export function ImportForm({
  action,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="examFile">
          Exam paper (PDF or Word .docx)
        </label>
        <input
          id="examFile"
          name="examFile"
          type="file"
          required
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-500">Up to 30MB.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="defaultMarks">
          Default marks
        </label>
        <input
          id="defaultMarks"
          name="defaultMarks"
          type="number"
          min={1}
          max={1000}
          defaultValue={10}
          className="w-32 rounded-md border border-gray-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          Used for any question that doesn&apos;t state its own marks in the paper.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Extracting questions… this can take a minute" : "Import questions"}
      </button>

      <p className="text-sm text-gray-500">
        Imported questions are added as <strong>inactive drafts</strong> so you can review each
        one — the AI may misread text or guess the wrong correct answer — before activating it
        for students.
      </p>
    </form>
  );
}
