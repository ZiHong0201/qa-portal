"use client";

import { useTransition } from "react";
import { deleteLiveQuiz } from "@/lib/actions/live";

/** Removes a game - a practice run, usually - with its players and answers. */
export function DeleteGameButton({ quizId, title }: { quizId: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete "${title}" and everyone's results from it? This cannot be undone.`)) {
          start(() => deleteLiveQuiz(quizId));
        }
      }}
      className="text-sm text-red-600 hover:underline disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
