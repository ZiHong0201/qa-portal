import { prisma } from "@/lib/prisma";
import { reviewSubmission } from "@/lib/actions/submissions";
import { SubmitButton } from "@/components/submit-button";

export default async function ReviewPage() {
  const pending = await prisma.submission.findMany({
    where: { status: "PENDING" },
    include: { question: true, student: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Pending review</h1>
      {pending.length === 0 && <p className="text-gray-500">Nothing to review right now.</p>}
      <ul className="flex flex-col gap-4">
        {pending.map((s) => (
          <li key={s.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">
              {s.student.name} · &ldquo;{s.question.body}&rdquo; · up to {s.question.points} marks
            </p>
            <p className="my-3 whitespace-pre-wrap rounded-md bg-gray-50 p-3">{s.answerText}</p>
            <form action={reviewSubmission.bind(null, s.id)} className="flex items-center gap-3">
              <input
                type="number"
                name="points"
                min={0}
                max={s.question.points}
                defaultValue={s.question.points}
                className="w-20 rounded-md border border-gray-300 px-2 py-1"
              />
              <SubmitButton
                name="decision"
                value="APPROVED"
                pendingText="..."
                className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
              >
                Approve
              </SubmitButton>
              <SubmitButton
                name="decision"
                value="REJECTED"
                pendingText="..."
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
              >
                Reject
              </SubmitButton>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
