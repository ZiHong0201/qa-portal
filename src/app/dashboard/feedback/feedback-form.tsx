"use client";

import { useActionState, useState } from "react";
import { sendMyFeedback, stopQuotingMine } from "@/lib/actions/feedback";
import { SubmitButton } from "@/components/submit-button";
import {
  ANONYMOUS_CREDIT,
  FEEDBACK_KINDS,
  KIND_LABELS,
  MAX_MESSAGE,
  MAX_SHORT_NAME,
  creditLine,
  guessFirstName,
  type FeedbackCredit,
  type FeedbackKind,
} from "@/lib/feedback";
import type { Result } from "@/lib/password.server";

const KIND_HINTS: Record<FeedbackKind, string> = {
  IDEA: "Something new you'd like to see",
  SUGGESTION: "Something we could do better",
  FEEDBACK: "How the classes or portal are going for you",
};

export function FeedbackForm({
  name,
  grade,
  remaining,
}: {
  name: string;
  grade: string | null;
  remaining: number;
}) {
  // Held in state: React resets an uncontrolled form once its action returns,
  // which would wipe a long message when the answer is an error.
  const [kind, setKind] = useState<FeedbackKind>("FEEDBACK");
  const [message, setMessage] = useState("");
  const [mayQuote, setMayQuote] = useState(false);
  const [credit, setCredit] = useState<FeedbackCredit>("FIRST_NAME_GRADE");
  const [shortName, setShortName] = useState(guessFirstName(name));
  const [state, action, pending] = useActionState(async (prev: Result, f: FormData) => {
    const r = await sendMyFeedback(prev, f);
    if (r.success) {
      setMessage("");
      // Permission is asked afresh each time, never carried over.
      setMayQuote(false);
    }
    return r;
  }, {});

  const shownAs = creditLine(credit, { name, grade }, shortName);

  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4">
      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>}

      <fieldset>
        <legend className="mb-1 text-sm font-medium">What is it?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {FEEDBACK_KINDS.map((k) => (
            <label
              key={k}
              className={`cursor-pointer rounded-md border px-3 py-2 text-sm ${
                kind === k ? "border-sky-400 bg-sky-50 text-sky-900" : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                className="sr-only"
              />
              <span className="block font-medium">{KIND_LABELS[k]}</span>
              <span className="block text-xs text-gray-500">{KIND_HINTS[k]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="message">
          Your message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          maxLength={MAX_MESSAGE}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <p className="mt-0.5 text-right text-xs text-gray-400">
          {message.length} / {MAX_MESSAGE}
        </p>
      </div>

      <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="mayQuote"
            checked={mayQuote}
            onChange={(e) => setMayQuote(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">You may quote this on the Mr Tan website</span>
            <span className="block text-xs text-gray-500">
              Anyone can read the website. Leave this off to keep your message between you and Mr Tan. Not sure? Ask
              a parent first. You can change your mind later on this page.
            </span>
          </span>
        </label>

        {mayQuote && (
          <fieldset className="mt-3 flex flex-col gap-2 border-t border-gray-200 pt-3 text-sm">
            <legend className="sr-only">How should we name you?</legend>
            <p className="font-medium">How should we name you?</p>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="credit"
                value="FULL_NAME"
                checked={credit === "FULL_NAME"}
                onChange={() => setCredit("FULL_NAME")}
                className="mt-0.5"
              />
              <span>
                My full name <span className="text-gray-500">({name})</span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="credit"
                value="FIRST_NAME_GRADE"
                checked={credit === "FIRST_NAME_GRADE"}
                onChange={() => setCredit("FIRST_NAME_GRADE")}
                className="mt-0.5"
              />
              <span className="flex-1">
                The name I go by{grade ? " and my grade" : ""}
                {credit === "FIRST_NAME_GRADE" && (
                  <input
                    name="shortName"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    maxLength={MAX_SHORT_NAME}
                    required
                    aria-label="The name to show"
                    className="mt-1 block w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 py-1.5"
                  />
                )}
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="credit"
                value="ANONYMOUS"
                checked={credit === "ANONYMOUS"}
                onChange={() => setCredit("ANONYMOUS")}
                className="mt-0.5"
              />
              <span>
                Don&apos;t name me <span className="text-gray-500">(&ldquo;{ANONYMOUS_CREDIT}&rdquo;)</span>
              </span>
            </label>
            <p className="rounded-md bg-white px-3 py-2 text-xs text-gray-600">
              It would be shown as: <span className="font-medium text-gray-900">— {shownAs || "…"}</span>
            </p>
          </fieldset>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || remaining <= 0}
          className="rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send"}
        </button>
        <span className="text-xs text-gray-500">
          {remaining <= 0
            ? "You've sent the most for today. Thank you! Come back tomorrow."
            : `You can send ${remaining} more today.`}
        </span>
      </div>
    </form>
  );
}

export function StopQuotingButton({ feedbackId }: { feedbackId: string }) {
  return (
    <form
      action={stopQuotingMine.bind(null, feedbackId)}
      onSubmit={(e) => {
        if (!confirm("Stop Mr Tan quoting this message? You can't turn it back on for this one.")) e.preventDefault();
      }}
    >
      <SubmitButton
        pendingText="Saving…"
        className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
      >
        Don&apos;t quote this
      </SubmitButton>
    </form>
  );
}
