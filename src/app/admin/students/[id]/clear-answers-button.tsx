"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { clearStudentAnswers, type ClearResult } from "@/lib/actions/answers";

/**
 * Clears a student's answers for one set, or for everything.
 *
 * The confirm text carries the two numbers that decide whether this is a good
 * idea - how many answers go, and what the balance becomes afterwards - rather
 * than making the teacher work them out from the row above. A student who has
 * already spent the marks can land below zero, so that figure is spelled out
 * instead of being a surprise on the next page load.
 */
export function ClearAnswersButton({
  studentId,
  studentName,
  questionSetId = null,
  setTitle,
  answered,
  marks,
  balance,
  className,
  label = "Clear",
}: {
  studentId: string;
  studentName: string;
  questionSetId?: string | null;
  setTitle?: string;
  answered: number;
  marks: number;
  balance: number;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [state, run, pending] = useActionState<ClearResult, void>(async () => {
    const result = await clearStudentAnswers(studentId, questionSetId);
    // The action revalidates on the server; this repaints the page we are
    // standing on so the row disappears without a manual reload.
    if (!result.error) router.refresh();
    return result;
  }, {});

  const after = balance - marks;
  const scope = setTitle ? `"${setTitle}"` : "every question set";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            confirm(
              `Reset ${scope} for ${studentName}?\n\n` +
                `This clears the ${answered} answer${answered === 1 ? "" : "s"} they have given, ` +
                `so they can sit it again from the start.\n\n` +
                `It takes back the ${marks} mark${marks === 1 ? "" : "s"} those answers earned, ` +
                `so the balance goes from ${balance} to ${after}${
                  after < 0 ? " (below zero until they earn it back)" : ""
                }. They earn the marks again by redoing the work.\n\n` +
                `The answers themselves cannot be recovered.`
            )
          ) {
            run();
          }
        }}
        className={
          className ??
          "rounded border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-50"
        }
      >
        {pending ? "Resetting…" : label}
      </button>
      {state.error && (
        <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</p>
      )}
    </div>
  );
}
