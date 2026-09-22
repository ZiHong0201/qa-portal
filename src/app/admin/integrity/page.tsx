import { prisma } from "@/lib/prisma";
import { SubmitButton } from "@/components/submit-button";
import { clearIntegrityNow } from "@/lib/actions/integrity";
import { integrityRetentionStatus, INTEGRITY_RETENTION_DAYS } from "@/lib/integrity.server";

// A correct answer faster than this is worth a glance. Reading a typical SPM
// question alone takes longer, so anything under it was almost certainly not
// worked out on the spot - though "I already knew this one" is a perfectly
// ordinary reason, which is why nothing here is automatic.
const FAST_SECONDS = 8;

function humanTime(seconds: number | null) {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  return `${m}m ${seconds % 60}s`;
}

export default async function IntegrityPage() {
  const [flagged, stats, retention] = await Promise.all([
    prisma.submission.findMany({
      where: {
        OR: [
          { AND: [{ secondsTaken: { not: null } }, { secondsTaken: { lt: FAST_SECONDS } }, { status: { in: ["CORRECT", "APPROVED"] } }] },
          { pasteAttempts: { gt: 0 } },
          { awayCount: { gt: 2 } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        student: { select: { name: true, grade: true } },
        question: { select: { body: true, questionSet: { select: { title: true, subject: true } } } },
      },
    }),
    prisma.submission.aggregate({
      where: { secondsTaken: { not: null } },
      _avg: { secondsTaken: true },
      _count: { _all: true },
    }),
    integrityRetentionStatus(),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-bold">Integrity signals</h1>
      <p className="mb-2 text-sm text-gray-500">
        Answers worth a second look — not evidence of anything. A fast correct answer usually just
        means the student knew it, and a tab switch is as often a notification as anything else.
      </p>
      <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Use these to start a conversation, never as proof. The browser cannot see a phone on the
        desk, so absence of a flag means nothing either.
      </p>

      <p className="mb-4 text-sm text-gray-600">
        {stats._count._all.toLocaleString()} timed answers so far, averaging{" "}
        {humanTime(stats._avg.secondsTaken ? Math.round(stats._avg.secondsTaken) : null)} each.
      </p>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-medium text-gray-800">Retention</p>
        <p className="mt-1 text-xs text-gray-500">
          Signals are wiped automatically once they are {INTEGRITY_RETENTION_DAYS} days old. Marks,
          answers and dates are never touched - only the timing and tab-switch columns.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          {retention.carrying === 0
            ? "Nothing is currently held."
            : `${retention.carrying.toLocaleString()} answer${
                retention.carrying === 1 ? "" : "s"
              } currently carry signals, the oldest from ${retention.oldest?.toLocaleDateString()}.`}
        </p>

        {retention.carrying > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={clearIntegrityNow.bind(null, "old")}>
              <SubmitButton
                pendingText="Clearing…"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
              >
                Clear older than {INTEGRITY_RETENTION_DAYS} days
              </SubmitButton>
            </form>
            <form action={clearIntegrityNow.bind(null, "all")}>
              <SubmitButton
                pendingText="Clearing…"
                className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                Clear everything now
              </SubmitButton>
            </form>
          </div>
        )}
      </div>

      {flagged.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500">
          Nothing flagged yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {flagged.map((s) => (
            <li key={s.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">
                  {s.student.name}
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {s.student.grade ?? "—"} · {s.question.questionSet.subject} ·{" "}
                    {s.question.questionSet.title}
                  </span>
                </p>
                <div className="flex shrink-0 flex-wrap gap-1.5 text-xs">
                  {s.secondsTaken !== null && s.secondsTaken < FAST_SECONDS && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">
                      answered in {humanTime(s.secondsTaken)}
                    </span>
                  )}
                  {s.pasteAttempts > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                      {s.pasteAttempts} paste attempt{s.pasteAttempts === 1 ? "" : "s"}
                    </span>
                  )}
                  {s.awayCount > 2 && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-800">
                      left the tab {s.awayCount}× ({humanTime(s.awaySeconds)})
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">{s.question.body}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {s.status} · {s.createdAt.toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
