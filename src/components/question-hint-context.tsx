"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type QuestionHint = { questionId: string; hints: string[] } | null;

const QuestionHintContext = createContext<{
  hint: QuestionHint;
  setHint: (hint: QuestionHint) => void;
} | null>(null);

export function QuestionHintProvider({ children }: { children: ReactNode }) {
  const [hint, setHint] = useState<QuestionHint>(null);
  return (
    <QuestionHintContext.Provider value={{ hint, setHint }}>
      {children}
    </QuestionHintContext.Provider>
  );
}

export function useQuestionHint() {
  const ctx = useContext(QuestionHintContext);
  if (!ctx) throw new Error("useQuestionHint must be used within QuestionHintProvider");
  return ctx;
}
