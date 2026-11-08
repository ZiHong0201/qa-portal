import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { hideFeedbackQuestion, moveFeedbackQuestion } from "@/lib/actions/feedback";
import { allQuestions } from "@/lib/feedback-questions.server";
import {
  MAX_QUESTIONS,
  QUESTION_TYPE_LABELS,
  ROLE_LABELS,
  choiceLines,
  isRole,
  parseChoices,
  type QuestionType,
} from "@/lib/feedback";
import { DeleteQuestionButton, QuestionForm } from "./question-form";

const SMALL_BUTTON = "rounded-md border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50";
const BADGE = "rounded-full px-2 py-0.5 text-xs font-medium";

/** ↑ or ↓; greyed out, rather than missing, at either end so the row does not shift. */
function MoveButton({ id, direction, enabled }: { id: string; direction: -1 | 1; enabled: boolean }) {
  const label = direction === -1 ? "Move up" : "Move down";
  const arrow = direction === -1 ? "↑" : "↓";
  if (!enabled) {
    return (
      <button type="button" disabled aria-label={label} className={`${SMALL_BUTTON} opacity-40`}>
        {arrow}
      </button>
    );
  }
  return (
    <form action={moveFeedbackQuestion.bind(null, id, direction)}>
      <SubmitButton pendingText="…" className={SMALL_BUTTON} aria-label={label}>
        {arrow}
      </SubmitButton>
    </form>
  );
}

/** The questions on the student Feedback form, in the order students see them. */
export default async function FeedbackQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const questions = await allQuestions();
  const canRate = !questions.some((q) => q.role === "RATING");
  const canRecommend = !questions.some((q) => q.role === "RECOMMEND");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Feedback questions</h1>
        <Link href="/admin/feedback" className="text-sm text-blue-600 hover:underline">
          Back to feedback
        </Link>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        What students are asked on their Feedback page, top to bottom. Hiding a question takes it off the form but keeps
        it here; deleting removes it. Either way, answers already given stay on their messages. The message question can
        be reworded but not removed, since it is the text a testimonial quotes.
      </p>

      <ol className="flex flex-col gap-3">
        {questions.map((q, i) => {
          const role = isRole(q.role) ? q.role : null;
          const choices = parseChoices(q.choices);
          const editing = edit === q.id;
          return (
            <li
              key={q.id}
              className={`rounded-lg border bg-white p-4 ${q.hidden ? "border-dashed border-gray-300 opacity-70" : "border-gray-200"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    <span className="mr-1 text-gray-400">{i + 1}.</span>
                    {q.labelEn}
                  </p>
                  {q.labelZh && <p className="text-sm text-gray-500">{q.labelZh}</p>}
                  {q.hintEn && <p className="mt-0.5 text-xs text-gray-500">{q.hintEn}</p>}
                  {choices.length > 0 && (
                    <p className="mt-1 text-xs text-gray-600">{choices.map((c) => c.en).join(" · ")}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className={`${BADGE} bg-gray-100 text-gray-700`}>
                      {QUESTION_TYPE_LABELS[q.type as QuestionType]}
                    </span>
                    <span className={`${BADGE} ${q.required ? "bg-sky-100 text-sky-800" : "bg-gray-100 text-gray-500"}`}>
                      {q.required ? "Required" : "Optional"}
                    </span>
                    {role && <span className={`${BADGE} bg-amber-100 text-amber-800`}>{ROLE_LABELS[role]}</span>}
                    {q.hidden && <span className={`${BADGE} bg-gray-200 text-gray-600`}>Hidden</span>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <MoveButton id={q.id} direction={-1} enabled={i > 0} />
                  <MoveButton id={q.id} direction={1} enabled={i < questions.length - 1} />
                  {!editing && (
                    <Link href={`/admin/feedback/questions?edit=${q.id}`} className={SMALL_BUTTON}>
                      Edit
                    </Link>
                  )}
                  {role !== "QUOTE" && (
                    <>
                      <form action={hideFeedbackQuestion.bind(null, q.id, !q.hidden)}>
                        <SubmitButton pendingText="Saving…" className={SMALL_BUTTON}>
                          {q.hidden ? "Show" : "Hide"}
                        </SubmitButton>
                      </form>
                      <DeleteQuestionButton id={q.id} label={q.labelEn} />
                    </>
                  )}
                </div>
              </div>

              {editing && (
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <QuestionForm
                    initial={{
                      id: q.id,
                      labelEn: q.labelEn,
                      labelZh: q.labelZh ?? "",
                      hintEn: q.hintEn ?? "",
                      hintZh: q.hintZh ?? "",
                      type: q.type as QuestionType,
                      role,
                      required: q.required,
                      choices: choiceLines(choices),
                    }}
                    canRate={canRate}
                    canRecommend={canRecommend}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-medium">Add a question</h2>
        {questions.length >= MAX_QUESTIONS ? (
          <p className="text-sm text-gray-500">
            The form has the most questions it can hold ({MAX_QUESTIONS}). Delete one to add another.
          </p>
        ) : (
          <QuestionForm canRate={canRate} canRecommend={canRecommend} />
        )}
      </div>
    </div>
  );
}
