"use client";

import { useActionState, useState } from "react";
import { sendMyFeedback, stopQuotingMine } from "@/lib/actions/feedback";
import { SubmitButton } from "@/components/submit-button";
import { useUiLang } from "@/components/ui-language";
import { feedbackText } from "@/lib/text/feedback";
import {
  ANONYMOUS_CREDIT,
  FEEDBACK_KINDS,
  MAX_MESSAGE,
  MAX_SHORT_NAME,
  creditLine,
  guessFirstName,
  stars,
  type FeedbackCredit,
  type FeedbackKind,
} from "@/lib/feedback";
import type { Result } from "@/lib/password.server";

export function FeedbackForm({
  name,
  grade,
  remaining,
}: {
  name: string;
  grade: string | null;
  remaining: number;
}) {
  const t = feedbackText[useUiLang()];
  // Held in state: React resets an uncontrolled form once its action returns,
  // which would wipe a long message when the answer is an error.
  const [kind, setKind] = useState<FeedbackKind>("FEEDBACK");
  const [message, setMessage] = useState("");
  const [mayQuote, setMayQuote] = useState(false);
  const [credit, setCredit] = useState<FeedbackCredit>("FIRST_NAME_GRADE");
  const [shortName, setShortName] = useState(guessFirstName(name));
  const [rating, setRating] = useState<number | null>(null);
  const [recommend, setRecommend] = useState<"yes" | "no" | null>(null);
  const [state, action, pending] = useActionState(async (prev: Result, f: FormData) => {
    const r = await sendMyFeedback(prev, f);
    if (r.success) {
      setMessage("");
      setRating(null);
      setRecommend(null);
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
        <legend className="mb-1 text-sm font-medium">{t.whatIsIt}</legend>
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
              <span className="block font-medium">{t.kindLabels[k]}</span>
              <span className="block text-xs text-gray-500">{t.kindHints[k]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="message">
          {t.yourMessage}
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

      {/* Both optional. Clicking the chosen answer again clears it, since a
          radio button cannot otherwise be un-chosen. */}
      <fieldset>
        <legend className="mb-1 text-sm font-medium">
          {t.rate} <span className="font-normal text-gray-400">{t.optional}</span>
        </legend>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer" title={t.starsLabel(n)}>
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                onClick={() => rating === n && setRating(null)}
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

      <fieldset>
        <legend className="mb-1 text-sm font-medium">
          {t.recommendQuestion} <span className="font-normal text-gray-400">{t.optional}</span>
        </legend>
        <div className="flex gap-2">
          {(["yes", "no"] as const).map((v) => (
            <label
              key={v}
              className={`cursor-pointer rounded-md border px-4 py-1.5 text-sm ${
                recommend === v ? "border-sky-400 bg-sky-50 text-sky-900" : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="recommend"
                value={v}
                checked={recommend === v}
                onChange={() => setRecommend(v)}
                onClick={() => recommend === v && setRecommend(null)}
                className="sr-only"
              />
              {v === "yes" ? t.yes : t.no}
            </label>
          ))}
        </div>
      </fieldset>

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
            <span className="font-medium">{t.mayQuote}</span>
            <span className="block text-xs text-gray-500">{t.mayQuoteHelp}</span>
          </span>
        </label>

        {mayQuote && (
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
        )}
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
