import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const student = await prisma.user.findUnique({
    where: { id: userId },
    select: { grade: true, subject: true },
  });

  if (!student?.grade || !student?.subject) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Question sets</h1>
        <p className="text-gray-500">
          Your grade and subject haven&apos;t been set yet. Ask your teacher to set them before
          you can see your question sets.
        </p>
      </div>
    );
  }

  const sets = await prisma.questionSet.findMany({
    where: { isActive: true, grade: student.grade, subject: student.subject },
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
      <h1 className="mb-1 text-2xl font-bold">Question sets</h1>
      <p className="mb-6 text-sm text-gray-500">
        {student.grade} · {student.subject}
      </p>
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

          return (
            <li key={set.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Link href={`/dashboard/sets/${set.id}`} className="font-medium hover:underline">
                    {set.title}
                  </Link>
                  {set.description && (
                    <p className="text-sm text-gray-500">{set.description}</p>
                  )}
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
            </li>
          );
        })}
        {sets.length === 0 && (
          <p className="text-gray-500">
            No question sets yet for {student.grade} {student.subject}. Check back soon.
          </p>
        )}
      </ul>
    </div>
  );
}
