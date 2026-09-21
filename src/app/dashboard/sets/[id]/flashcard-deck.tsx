"use client";

import { useEffect, useState } from "react";
import { AnswerForm } from "./answer-form";
import { RunningCat } from "@/components/running-cat";
import { CelebratingCat } from "@/components/celebrating-cat";
import { CatWink } from "@/components/cat-wink";
import { SetCompleteCelebration } from "@/components/set-complete-celebration";
import { useQuestionHint } from "@/components/question-hint-context";
import type { SubmitAnswerState } from "@/lib/actions/submissions";

export type FlashcardChoice = { id: string; text: string };

export type FlashcardQuestion = {
  id: string;
  body: string;
  diagramUrl: string | null;
  points: number;
  choices: FlashcardChoice[];
  submission: { status: string; pointsAwarded: number; secondsTaken?: number | null } | null;
  correctAnswerText: string | null;
  explanation: string | null;
  hints: string[];
};

const MESSAGES: Record<string, (points: number) => string> = {
  PENDING: () => "Your answer has been submitted and is awaiting teacher review.",
  CORRECT: (p) => `Correct! You earned ${p} marks.`,
  INCORRECT: () => "That wasn't correct. No marks were awarded.",
  APPROVED: (p) => `Approved! You earned ${p} marks.`,
  REJECTED: () => "Your answer wasn't approved. No marks were awarded.",
};

/** Seconds as "1m 20s", or "45s" under a minute. */
function humanTime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`;
}

/**
 * Shown only once every question is answered. Students see how long they took
 * per question afterwards, as something to reflect on - never while they are
 * still working, where a visible clock would just add pressure.
 *
 * Questions answered before timing was recorded have no value, so they are
 * left out of the average rather than counted as zero.
 */
function TimingSummary({ cards }: { cards: FlashcardQuestion[] }) {
  const timed = cards
    .map((c, i) => ({ n: i + 1, seconds: c.submission?.secondsTaken ?? null, card: c }))
    .filter((t): t is { n: number; seconds: number; card: FlashcardQuestion } => t.seconds !== null);

  if (timed.length === 0) return null;

  const total = timed.reduce((sum, t) => sum + t.seconds, 0);
  const average = Math.round(total / timed.length);
  const slowest = timed.reduce((a, b) => (b.seconds > a.seconds ? b : a));

  return (
    <details className="mb-6 rounded-xl border border-sky-100 bg-white p-4">
      <summary className="cursor-pointer text-sm font-medium text-sky-900">
        How long you took &middot; {humanTime(total)} in total, {humanTime(average)} on average
      </summary>

      <p className="mt-2 text-xs text-gray-500">
        Your slowest was question {slowest.n} at {humanTime(slowest.seconds)}. Taking longer is not
        a bad thing - it usually means you were working it through.
      </p>

      <ul className="mt-3 flex flex-col gap-1">
        {timed.map((t) => {
          const status = t.card.submission!.status;
          return (
            <li key={t.card.id} className="flex items-center gap-2 text-xs">
              <span className="w-8 shrink-0 text-gray-400">Q{t.n}</span>
              <span
                className={`h-1.5 rounded-full ${isCorrect(status) ? "bg-emerald-400" : "bg-rose-300"}`}
                // Relative to the slowest answer, so the shape of the set is
                // visible at a glance without reading every number.
                style={{ width: `${Math.max(4, (t.seconds / slowest.seconds) * 60)}%` }}
              />
              <span className="shrink-0 text-gray-500">{humanTime(t.seconds)}</span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function isCorrect(status: string) {
  return status === "CORRECT" || status === "APPROVED";
}

const STATUS_TEXT_COLOR: Record<string, string> = {
  PENDING: "text-blue-700",
  CORRECT: "text-emerald-700",
  APPROVED: "text-emerald-700",
  INCORRECT: "text-rose-700",
  REJECTED: "text-rose-700",
};

export function FlashcardDeck({ questions }: { questions: FlashcardQuestion[] }) {
  const [cards, setCards] = useState(questions);
  const [index, setIndex] = useState(() => {
    const firstUnanswered = questions.findIndex((q) => !q.submission);
    return firstUnanswered === -1 ? 0 : firstUnanswered;
  });
  const [justCompleted, setJustCompleted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // The id of the card that was just answered correctly, and so should slide
  // on by itself. Holding the id rather than a boolean means revisiting an
  // answered card with Previous never re-triggers the advance - the student
  // can go back and reread the explanation for as long as they like.
  const [autoAdvanceId, setAutoAdvanceId] = useState<string | null>(null);
  // True while an answer is being submitted; navigation is held until it
  // lands, so the result can never be stranded on the server (see AnswerForm).
  const [submitting, setSubmitting] = useState(false);

  const total = cards.length;
  const safeIndex = Math.min(index, total - 1);
  const q = cards[safeIndex];
  const submission = q.submission;

  const { setHint } = useQuestionHint();
  useEffect(() => {
    setHint(q.hints.length > 0 ? { questionId: q.id, hints: q.hints } : null);
    return () => setHint(null);
  }, [q.id, q.hints, setHint]);

  // Only a card just answered correctly advances on its own. A wrong answer
  // stays put so the student can read why, and moves on when they press Next.
  useEffect(() => {
    if (autoAdvanceId !== q.id || safeIndex >= total - 1) return;
    const advanceDelay = 1400;
    const fadeDuration = 220;
    const startFade = setTimeout(() => setLeaving(true), advanceDelay);
    const advance = setTimeout(() => {
      setIndex((i) => Math.min(total - 1, i + 1));
      setLeaving(false);
      setAutoAdvanceId(null);
    }, advanceDelay + fadeDuration);
    return () => {
      clearTimeout(startFade);
      clearTimeout(advance);
    };
  }, [autoAdvanceId, q.id, safeIndex, total]);

  // Hold the overlay back for a beat so the student reads the result of the
  // answer that finished the set before the curtain comes down on it.
  useEffect(() => {
    if (!justCompleted) return;
    const t = setTimeout(() => setShowCelebration(true), 900);
    return () => clearTimeout(t);
  }, [justCompleted]);

  const progressPct = total > 0 ? ((safeIndex + 1) / total) * 100 : 0;

  const answered = cards.filter((c) => c.submission).length;
  const totalMarks = cards.reduce((sum, c) => sum + c.points, 0);
  const marksObtained = cards.reduce((sum, c) => sum + (c.submission?.pointsAwarded ?? 0), 0);
  const complete = total > 0 && answered === total;

  function handleSubmitted(questionId: string, result: NonNullable<SubmitAnswerState["result"]>) {
    const next = cards.map((c) =>
      c.id === questionId
        ? {
            ...c,
            submission: { status: result.status, pointsAwarded: result.pointsAwarded },
            correctAnswerText: result.correctAnswerText,
            explanation: result.explanation,
          }
        : c
    );
    setCards(next);

    // Correct answers carry straight on; a wrong one waits for the student.
    if (isCorrect(result.status)) setAutoAdvanceId(questionId);

    const wasComplete = cards.every((c) => c.submission);
    const nowComplete = next.every((c) => c.submission);
    if (!wasComplete && nowComplete && next.length > 0) {
      setJustCompleted(true);
    }
  }

  return (
    <div>
      {showCelebration && (
        <SetCompleteCelebration
          marksObtained={marksObtained}
          totalMarks={totalMarks}
          onClose={() => setShowCelebration(false)}
        />
      )}

      {complete ? (
        <>
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            {justCompleted && <CelebratingCat className="shrink-0" />}
            <p className="font-medium text-emerald-800">
              You&apos;ve completed this set. Marks obtained: {marksObtained} / {totalMarks}
            </p>
          </div>
          <TimingSummary cards={cards} />
        </>
      ) : (
        <p className="mb-6 inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-800">
          {answered} / {total} answered
        </p>
      )}

      <div
        key={q.id}
        className={`rounded-xl border border-sky-100 bg-white p-4 shadow-sm transition-opacity duration-200 ease-in ${
          leaving ? "opacity-0" : "animate-card-enter opacity-100"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
            Card {safeIndex + 1} of {total} · {q.points} marks
          </span>
        </div>

        <p className="mb-3 whitespace-pre-wrap font-medium text-gray-900">{q.body}</p>
        {q.diagramUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={q.diagramUrl}
            alt="Diagram for this question"
            className="mb-3 max-w-full rounded-md border border-sky-200"
          />
        )}

        {submission ? (
          <div className="rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2">
            <div className="flex items-center gap-2">
              {(submission.status === "CORRECT" || submission.status === "APPROVED") && (
                <CatWink key={q.id} className="animate-cat-pop h-7 w-7 shrink-0" />
              )}
              <p className={`text-sm font-medium ${STATUS_TEXT_COLOR[submission.status]}`}>
                {MESSAGES[submission.status](submission.pointsAwarded)}
              </p>
            </div>
            {submission.status !== "PENDING" && (
              <div className="mt-2 border-t border-sky-200 pt-2 text-sm text-sky-900/80">
                <p>
                  <span className="font-medium text-sky-950">Correct answer:</span>{" "}
                  {q.correctAnswerText ?? "—"}
                </p>
                {q.explanation && <p className="mt-1">{q.explanation}</p>}
                {!isCorrect(submission.status) && safeIndex < total - 1 && (
                  <p className="mt-2 text-xs font-medium text-sky-600">
                    Take your time reading this — press Next when you&apos;re ready.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <AnswerForm
            questionId={q.id}
            choices={q.choices}
            onSubmitted={(result) => handleSubmitted(q.id, result)}
            onPendingChange={setSubmitting}
          />
        )}
      </div>

      <div className="relative mt-8 mb-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-sky-100">
          <div
            className="h-full rounded-full bg-sky-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div
          className="absolute -top-3.5 -translate-x-1/2 transition-all duration-500 ease-out"
          style={{ left: `${progressPct}%` }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md ring-2 ring-sky-300">
            <RunningCat className="h-6 w-6 animate-bounce" />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setLeaving(false);
            // Cancels any advance still pending on the card being left, so
            // stepping back doesn't get yanked forward a moment later.
            setAutoAdvanceId(null);
            setIndex((i) => Math.max(0, i - 1));
          }}
          disabled={safeIndex === 0 || submitting}
          className="rounded-lg border border-sky-200 px-4 py-2 font-medium text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          &larr; Previous
        </button>
        <button
          type="button"
          onClick={() => {
            setLeaving(false);
            setAutoAdvanceId(null);
            setIndex((i) => Math.min(total - 1, i + 1));
          }}
          disabled={safeIndex === total - 1 || !submission || submitting}
          title={!submission ? "Answer this question before moving on" : undefined}
          className="rounded-lg border border-sky-200 px-4 py-2 font-medium text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
}
