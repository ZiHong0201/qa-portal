import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { feedbackLeftToday, myFeedback } from "@/lib/feedback.server";
import { KIND_LABELS } from "@/lib/feedback";
import { FeedbackForm, StopQuotingButton } from "./feedback-form";

const sentOn = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });

export default async function FeedbackPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [student, sent, remaining] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, grade: true } }),
    myFeedback(userId),
    feedbackLeftToday(userId),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">Feedback</h1>
      <p className="mb-6 text-sm text-gray-500">
        Got an idea, a suggestion, or something to say about the classes or this portal? Tell Mr Tan here.
      </p>

      <FeedbackForm
        name={student?.name ?? session!.user.name ?? ""}
        grade={student?.grade ?? null}
        remaining={remaining}
      />

      <h2 className="mt-8 mb-3 font-medium">What you&apos;ve sent</h2>
      {sent.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sent.map((f) => (
            <li key={f.id} className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-800">
                  {KIND_LABELS[f.kind]}
                </span>
                <span className="text-gray-500">{sentOn(f.createdAt)}</span>
                {f.readAt && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">Read by Mr Tan</span>
                )}
              </div>
              <p className="whitespace-pre-wrap text-gray-800">{f.message}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                {f.mayQuote ? (
                  <>
                    <span>May be quoted on the website as &ldquo;{f.creditLine}&rdquo;</span>
                    <StopQuotingButton feedbackId={f.id} />
                  </>
                ) : (
                  <span>Not for the website</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
