"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { deleteFeedbackQuestion, saveFeedbackQuestion } from "@/lib/actions/feedback";
import { SubmitButton } from "@/components/submit-button";
import {
  MAX_CHOICES,
  MAX_HINT,
  MAX_LABEL,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  ROLE_TYPE,
  type QuestionRole,
  type QuestionType,
} from "@/lib/feedback";

const FIELD = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";
const LABEL = "mb-1 block text-sm font-medium";

export type QuestionFormInitial = {
  id: string;
  labelEn: string;
  labelZh: string;
  hintEn: string;
  hintZh: string;
  type: QuestionType;
  role: QuestionRole | null;
  required: boolean;
  /** One option per line, "English | 中文". */
  choices: string;
};

/**
 * Adds a question, or edits one when `initial` is given. `canRate` and
 * `canRecommend` say whether a STARS or YES_NO question may take that job -
 * true when no other question already has it.
 */
export function QuestionForm({
  initial,
  canRate,
  canRecommend,
}: {
  initial?: QuestionFormInitial;
  canRate: boolean;
  canRecommend: boolean;
}) {
  const [state, action, pending] = useActionState(saveFeedbackQuestion.bind(null, initial?.id ?? null), {});
  const role = initial?.role ?? null;
  const [type, setType] = useState<QuestionType>(initial?.type ?? "SHORT_TEXT");
  const [useAsRole, setUseAsRole] = useState(role !== null);

  // A question keeps the type its job needs; the message never loses its job.
  const typeFixed = role === "QUOTE" || (role !== null && useAsRole);
  const shownType = typeFixed && role ? ROLE_TYPE[role] : type;
  const roleOffer =
    shownType === "STARS" && (canRate || role === "RATING")
      ? "Use as the overall rating: the average on the feedback page, and the rating in the testimonial download"
      : shownType === "YES_NO" && (canRecommend || role === "RECOMMEND")
        ? "Use for “Would recommend Mr Tan” on the feedback page"
        : null;

  return (
    <form action={action} className="flex flex-col gap-3">
      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor={`labelEn-${initial?.id ?? "new"}`}>
            Question (English)
          </label>
          <input
            id={`labelEn-${initial?.id ?? "new"}`}
            name="labelEn"
            required
            maxLength={MAX_LABEL}
            defaultValue={initial?.labelEn}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={`labelZh-${initial?.id ?? "new"}`}>
            Question (中文) <span className="font-normal text-gray-400">optional</span>
          </label>
          <input
            id={`labelZh-${initial?.id ?? "new"}`}
            name="labelZh"
            maxLength={MAX_LABEL}
            defaultValue={initial?.labelZh}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={`hintEn-${initial?.id ?? "new"}`}>
            Hint under it (English) <span className="font-normal text-gray-400">optional</span>
          </label>
          <input
            id={`hintEn-${initial?.id ?? "new"}`}
            name="hintEn"
            maxLength={MAX_HINT}
            defaultValue={initial?.hintEn}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor={`hintZh-${initial?.id ?? "new"}`}>
            Hint under it (中文) <span className="font-normal text-gray-400">optional</span>
          </label>
          <input
            id={`hintZh-${initial?.id ?? "new"}`}
            name="hintZh"
            maxLength={MAX_HINT}
            defaultValue={initial?.hintZh}
            className={FIELD}
          />
        </div>
      </div>
      <p className="-mt-1 text-xs text-gray-500">Students reading in 中文 see the English wherever the 中文 is left empty.</p>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className={LABEL} htmlFor={`type-${initial?.id ?? "new"}`}>
            Type of answer
          </label>
          <select
            id={`type-${initial?.id ?? "new"}`}
            name="type"
            value={shownType}
            onChange={(e) => setType(e.target.value as QuestionType)}
            disabled={typeFixed}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {QUESTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        {role === "QUOTE" ? (
          <p className="pb-2 text-xs text-gray-500">Always required: it is the text a testimonial quotes.</p>
        ) : (
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="required" defaultChecked={initial?.required ?? false} />
            Students must answer it
          </label>
        )}
      </div>

      {shownType === "CHOICE" && (
        <div>
          <label className={LABEL} htmlFor={`choices-${initial?.id ?? "new"}`}>
            Options
          </label>
          <textarea
            id={`choices-${initial?.id ?? "new"}`}
            name="choices"
            rows={4}
            defaultValue={initial?.choices}
            placeholder={"Idea | 想法\nSuggestion | 建议\nFeedback | 反馈"}
            className={`${FIELD} font-mono`}
          />
          <p className="mt-0.5 text-xs text-gray-500">
            One per line, 2 to {MAX_CHOICES}. Add the 中文 after a bar: <code>Idea | 想法</code>
          </p>
        </div>
      )}

      {roleOffer && role !== "QUOTE" && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="useAsRole"
            checked={useAsRole}
            onChange={(e) => setUseAsRole(e.target.checked)}
            className="mt-0.5"
          />
          <span>{roleOffer}</span>
        </label>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : initial ? "Save question" : "Add question"}
        </button>
        {initial && (
          <Link href="/admin/feedback/questions" className="text-sm text-gray-600 hover:underline">
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}

export function DeleteQuestionButton({ id, label }: { id: string; label: string }) {
  return (
    <form
      action={deleteFeedbackQuestion.bind(null, id)}
      onSubmit={(e) => {
        if (!confirm(`Delete “${label}”? Answers students already gave stay on their messages.`)) e.preventDefault();
      }}
    >
      <SubmitButton
        pendingText="Deleting…"
        className="rounded-md border border-red-300 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
      >
        Delete
      </SubmitButton>
    </form>
  );
}
