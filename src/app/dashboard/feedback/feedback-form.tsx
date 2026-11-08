"use client";

import { startTransition, useActionState, useState } from "react";
import { sendMyFeedback, stopQuotingMine } from "@/lib/actions/feedback";
import { SubmitButton } from "@/components/submit-button";
import { useUiLang } from "@/components/ui-language";
import { feedbackText } from "@/lib/text/feedback";
import {
  ANONYMOUS_CREDIT,
  MAX_MESSAGE,
  MAX_SHORT_ANSWER,
  MAX_SHORT_NAME,
  creditLine,
  guessFirstName,
  stars,
  type FeedbackCredit,
  type FormQuestion,
} from "@/lib/feedback";
import type { Result } from "@/lib/password.server";

const PILL = "cursor-pointer rounded-md border px-3 py-2 text-sm";
const pillState = (on: boolean) =>
  on ? "border-sky-400 bg-sky-50 text-sky-900" : "border-gray-300 hover:bg-gray-50";

export function FeedbackForm({
  name,
  grade,
  remaining,
  questions,
}: {
  name: string;
  grade: string | null;
  remaining: number;
  /** The admin's questions, in order and in the student's language. */
  questions: FormQuestion[];
}) {
  const t = feedbackText[useUiLang()];
  // Held in state: React resets an uncontrolled form once its action returns,
  // which would wipe a long message when the answer is an error. Keyed by
  // question id; a missing key is unanswered.
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // Every message may go on the website, so nobody is named unless they pick it.
  const [credit, setCredit] = useState<FeedbackCredit>("ANONYMOUS");
  const [shortName, setShortName] = useState(guessFirstName(name));
  const [state, action, pending] = useActionState(async (prev: Result, f: FormData) => {
    const r = await sendMyFeedback(prev, f);
    if (r.success) {
      setAnswers({});
      // How to be named is asked afresh each time, never carried over.
      setCredit("ANONYMOUS");
    }
    return r;
  }, {});

  const set = (id: string, value: string | null) =>
    setAnswers((a) => {
      const next = { ...a };
      if (value === null) delete next[id];
      else next[id] = value;
      return next;
    });
  // Clicking the chosen option again clears it, since a radio button cannot
  // otherwise be un-chosen - but only where the question may be skipped.
  const pick = (q: FormQuestion, value: string) => () => {
    if (!q.required && answers[q.id] === value) set(q.id, null);
  };

  const shownAs = creditLine(credit, { name, grade }, shortName);

  return (
    // Sent from onSubmit rather than action={...}: React resets a form after
    // its action returns, and that unticks the hidden radio buttons behind
    // the stars and options while the page still shows them chosen - so a
    // student correcting an error would resend without them. This way nothing
    // resets, and a successful send clears the answers itself.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4"
    >
      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>}

      {questions.map((q) => {
        const field = `a_${q.id}`;
        const value = answers[q.id] ?? "";
        const heading = (
          <>
            {q.label} {!q.required && <span className="font-normal text-gray-400">{t.optional}</span>}
          </>
        );
        const hint = q.hint && <span className="mb-1 block text-xs text-gray-500">{q.hint}</span>;

        if (q.type === "LONG_TEXT" || q.type === "SHORT_TEXT") {
          const max = q.type === "LONG_TEXT" ? MAX_MESSAGE : MAX_SHORT_ANSWER;
          return (
            <div key={q.id}>
              <label className="mb-1 block text-sm font-medium" htmlFor={field}>
                {heading}
              </label>
              {hint}
              {q.type === "LONG_TEXT" ? (
                <>
                  <textarea
                    id={field}
                    name={field}
                    required={q.required}
                    rows={5}
                    maxLength={max}
                    value={value}
                    onChange={(e) => set(q.id, e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                  <p className="mt-0.5 text-right text-xs text-gray-400">
                    {value.length} / {max}
                  </p>
                </>
              ) : (
                <input
                  id={field}
                  name={field}
                  required={q.required}
                  maxLength={max}
                  value={value}
                  onChange={(e) => set(q.id, e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              )}
            </div>
          );
        }

        if (q.type === "STARS") {
          const rating = value ? Number(value) : null;
          return (
            <fieldset key={q.id}>
              <legend className="mb-1 text-sm font-medium">{heading}</legend>
              {hint}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="cursor-pointer" title={t.starsLabel(n)}>
                    <input
                      type="radio"
                      name={field}
                      value={n}
                      checked={rating === n}
                      onChange={() => set(q.id, String(n))}
                      onClick={pick(q, String(n))}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`text-3xl leading-none ${rating !== null && n <= rating ? "text-amber-400" : "text-gray-300 hover:text-amber-200"}`}
                    >
                      ★
                    </span>
                    <span className="sr-only">{t.starsLabel(n)}</span>
                  </label>
                ))}
                {rating !== null && <span className="ml-2 text-xs text-gray-500">{stars(rating)} {rating} / 5</span>}
              </div>
            </fieldset>
          );
        }

        const options =
          q.type === "YES_NO"
            ? [
                { value: "yes", label: t.yes },
                { value: "no", label: t.no },
              ]
            : q.choices;
        return (
          <fieldset key={q.id}>
            <legend className="mb-1 text-sm font-medium">{heading}</legend>
            {hint}
            <div className={q.type === "YES_NO" ? "flex gap-2" : "grid gap-2 sm:grid-cols-3"}>
              {options.map((o) => (
                <label key={o.value} className={`${PILL} ${pillState(value === o.value)}`}>
                  <input
                    type="radio"
                    name={field}
                    value={o.value}
                    checked={value === o.value}
                    onChange={() => set(q.id, o.value)}
                    onClick={pick(q, o.value)}
                    className="sr-only"
                  />
                  <span className={q.type === "YES_NO" ? "" : "font-medium"}>{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}

      <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs text-gray-600">{t.quoteNotice}</p>
        <fieldset className="mt-3 flex flex-col gap-2 border-t border-gray-200 pt-3 text-sm">
          <legend className="sr-only">{t.howName}</legend>
          <p className="font-medium">{t.howName}</p>
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
              {t.fullName} <span className="text-gray-500">({name})</span>
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
              {t.nameIGoBy(!!grade)}
              {credit === "FIRST_NAME_GRADE" && (
                <input
                  name="shortName"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  maxLength={MAX_SHORT_NAME}
                  required
                  aria-label={t.nameToShow}
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
              {/* The anonymous credit stays in English: it is what the website prints. */}
              {t.dontName} <span className="text-gray-500">(&ldquo;{ANONYMOUS_CREDIT}&rdquo;)</span>
            </span>
          </label>
          <p className="rounded-md bg-white px-3 py-2 text-xs text-gray-600">
            {t.shownAs} <span className="font-medium text-gray-900">— {shownAs || "…"}</span>
          </p>
        </fieldset>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || remaining <= 0}
          className="rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {pending ? t.sending : t.send}
        </button>
        <span className="text-xs text-gray-500">
          {remaining <= 0 ? t.limitReached : t.canSendMore(remaining)}
        </span>
      </div>
    </form>
  );
}

export function StopQuotingButton({ feedbackId }: { feedbackId: string }) {
  const t = feedbackText[useUiLang()];
  return (
    <form
      action={stopQuotingMine.bind(null, feedbackId)}
      onSubmit={(e) => {
        if (!confirm(t.stopConfirm)) e.preventDefault();
      }}
    >
      <SubmitButton
        pendingText={t.saving}
        className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
      >
        {t.dontQuote}
      </SubmitButton>
    </form>
  );
}
