"use client";

import { useState } from "react";
import { AnswerForm } from "./answer-form";
import type { SubmitAnswerState } from "@/lib/actions/submissions";

export type FlashcardChoice = { id: string; text: string };

export type FlashcardQuestion = {
  id: string;
  body: string;
  diagramUrl: string | null;
  points: number;
  choices: FlashcardChoice[];
  submission: { status: string; pointsAwarded: number } | null;
  correctAnswerText: string | null;
  explanation: string | null;
};

const MESSAGES: Record<string, (points: number) => string> = {
  PENDING: () => "Your answer has been submitted and is awaiting teacher review.",
  CORRECT: (p) => `Correct! You earned ${p} marks.`,
  INCORRECT: () => "That wasn't correct. No marks were awarded.",
  APPROVED: (p) => `Approved! You earned ${p} marks.`,
  REJECTED: () => "Your answer wasn't approved. No marks were awarded.",
};

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

  const total = cards.length;
  const safeIndex = Math.min(index, total - 1);
  const q = cards[safeIndex];
  const submission = q.submission;

  const answered = cards.filter((c) => c.submission).length;
  const totalMarks = cards.reduce((sum, c) => sum + c.points, 0);
  const marksObtained = cards.reduce((sum, c) => sum + (c.submission?.pointsAwarded ?? 0), 0);
  const complete = total > 0 && answered === total;

  function handleSubmitted(questionId: string, result: NonNullable<SubmitAnswerState["result"]>) {
    setCards((prev) =>
      prev.map((c) =>
        c.id === questionId
          ? {
              ...c,
              submission: { status: result.status, pointsAwarded: result.pointsAwarded },
              correctAnswerText: result.correctAnswerText,
              explanation: result.explanation,
            }
          : c
      )
    );
  }

  return (
    <div>
      {complete ? (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-medium text-emerald-800">
            You&apos;ve completed this set. Marks obtained: {marksObtained} / {totalMarks}
          </p>
        </div>
      ) : (
        <p className="mb-6 inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-800">
          {answered} / {total} answered
        </p>
      )}

      <div className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm">
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
            <p className={`text-sm font-medium ${STATUS_TEXT_COLOR[submission.status]}`}>
              {MESSAGES[submission.status](submission.pointsAwarded)}
            </p>
            {submission.status !== "PENDING" && (
              <div className="mt-2 border-t border-sky-200 pt-2 text-sm text-sky-900/80">
                <p>
                  <span className="font-medium text-sky-950">Correct answer:</span>{" "}
                  {q.correctAnswerText ?? "—"}
                </p>
                {q.explanation && <p className="mt-1">{q.explanation}</p>}
              </div>
            )}
          </div>
        ) : (
          <AnswerForm
            questionId={q.id}
            choices={q.choices}
            onSubmitted={(result) => handleSubmitted(q.id, result)}
          />
        )}
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-sky-100">
        <div
          className="h-full rounded-full bg-sky-500 transition-all"
          style={{ width: `${((safeIndex + 1) / total) * 100}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={safeIndex === 0}
          className="rounded-lg border border-sky-200 px-4 py-2 font-medium text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          &larr; Previous
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          disabled={safeIndex === total - 1}
          className="rounded-lg border border-sky-200 px-4 py-2 font-medium text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
}
