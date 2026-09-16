import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { themeFor } from "@/components/subject-art";

export default async function StudentSetsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const { subject: subjectFilter } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const student = await prisma.user.findUnique({
    where: { id: userId },
    select: { grade: true, subjects: { select: { subject: true } } },
  });
  const subjectNames = student?.subjects.map((s) => s.subject) ?? [];

  if (!student?.grade || subjectNames.length === 0) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Question sets</h1>
        <p className="text-gray-500">
          Your grade and subjects haven&apos;t been set yet. Ask your teacher to set them before
          you can see your question sets.
        </p>
      </div>
    );
  }

  // An unknown or unenrolled ?subject= falls back to everything rather than an
  // empty page, so a stale link can't look like "your sets disappeared".
  const activeSubject =
    subjectFilter && subjectNames.includes(subjectFilter) ? subjectFilter : null;

  const sets = await prisma.questionSet.findMany({
    where: {
      isActive: true,
      grades: { some: { grade: student.grade } },
      subject: activeSubject ? activeSubject : { in: subjectNames },
    },
    orderBy: { createdAt: "desc" },
    include: {
      questions: {
        where: { isActive: true },
        include: {
          submissions: { where: { studentId: userId } },
        },
      },
    },
  });

  return (
    <div>
      <Link
        href="/dashboard"
        className="text-sm font-medium text-sky-600 hover:text-sky-800 hover:underline"
      >
        &larr; Home
      </Link>
      <h1 className="mt-2 mb-1 text-2xl font-bold text-sky-950">
        {activeSubject ?? "Question sets"}
      </h1>
      <p className="mb-4 text-sm text-gray-500">
        {student.grade} · {activeSubject ?? subjectNames.join(", ")}
      </p>

      {subjectNames.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href="/dashboard/sets"
            className={`rounded-full border px-3 py-1 text-sm font-medium ${
              activeSubject
                ? "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                : "border-sky-300 bg-sky-100 text-sky-800"
            }`}
          >
            All
          </Link>
          {subjectNames.map((name) => {
            const theme = themeFor(name);
            return (
              <Link
                key={name}
                href={`/dashboard/sets?subject=${encodeURIComponent(name)}`}
                className={`rounded-full border px-3 py-1 text-sm font-medium ${
                  activeSubject === name
                    ? `border-transparent ${theme.band} ${theme.text}`
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {name}
              </Link>
            );
          })}
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {sets.map((set) => {
          const total = set.questions.length;
          const answered = set.questions.filter((q) => q.submissions.length > 0).length;
          const totalMarks = set.questions.reduce((sum, q) => sum + q.points, 0);
          const marksObtained = set.questions.reduce(
            (sum, q) => sum + (q.submissions[0]?.pointsAwarded ?? 0),
            0
          );
          const complete = total > 0 && answered === total;
          const theme = themeFor(set.subject);

          return (
            <li key={set.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link href={`/dashboard/sets/${set.id}`} className="font-medium hover:underline">
                    {set.title}
                  </Link>
                  {set.description && <p className="text-sm text-gray-500">{set.description}</p>}
                  <p className="text-sm text-gray-500">
                    {total} question{total === 1 ? "" : "s"} · {totalMarks} marks total
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    complete
                      ? "bg-green-100 text-green-700"
                      : answered > 0
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {complete
                    ? `${marksObtained} / ${totalMarks} marks`
                    : `${answered} / ${total} answered`}
                </span>
              </div>
              {answered > 0 && !complete && (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${theme.bar}`}
                    style={{ width: `${(answered / total) * 100}%` }}
                  />
                </div>
              )}
            </li>
          );
        })}
        {sets.length === 0 && (
          <p className="text-gray-500">
            No question sets yet for {student.grade} {activeSubject ?? subjectNames.join(", ")}.
            Check back soon.
          </p>
        )}
      </ul>
    </div>
  );
}
