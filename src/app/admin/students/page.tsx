import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GradeEditor } from "./grade-editor";
import { SubjectEditor } from "./subject-editor";
import { getGradeNames } from "@/lib/grades";
import { getSubjectNames } from "@/lib/subjects";
import type { Prisma } from "@/generated/prisma/client";

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; grade?: string; subject?: string; q?: string }>;
}) {
  const { created, grade, subject, q } = await searchParams;

  const where: Prisma.UserWhereInput = { role: "STUDENT" };
  if (grade) where.grade = grade;
  if (subject) where.subjects = { some: { subject } };
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
    ];
  }

  const [students, grades, subjects, earnedRows, adjustmentRows, redeemedRows] =
    await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { subjects: true },
      }),
      getGradeNames(),
      getSubjectNames(),
      prisma.submission.groupBy({
        by: ["studentId"],
        where: { status: { in: ["CORRECT", "APPROVED"] } },
        _sum: { pointsAwarded: true },
      }),
      prisma.pointAdjustment.groupBy({ by: ["studentId"], _sum: { amount: true } }),
      prisma.redemption.groupBy({ by: ["studentId"], _sum: { cost: true } }),
    ]);

  const balanceByStudent = new Map<string, number>();
  for (const s of students) {
    const earned = earnedRows.find((r) => r.studentId === s.id)?._sum.pointsAwarded ?? 0;
    const adjustments = adjustmentRows.find((r) => r.studentId === s.id)?._sum.amount ?? 0;
    const redeemed = redeemedRows.find((r) => r.studentId === s.id)?._sum.cost ?? 0;
    balanceByStudent.set(s.id, earned + adjustments - redeemed);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <Link
          href="/admin/students/new"
          className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          + New student
        </Link>
      </div>
      {created && (
        <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Student account created.
        </p>
      )}

      <form className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="q">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Name or email"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="grade">
            Grade
          </label>
          <select
            id="grade"
            name="grade"
            defaultValue={grade ?? ""}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All grades</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="subject">
            Subject
          </label>
          <select
            id="subject"
            name="subject"
            defaultValue={subject ?? ""}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-1.5 text-sm text-white hover:bg-gray-800"
        >
          Filter
        </button>
        {(grade || subject || q) && (
          <Link href="/admin/students" className="text-sm text-blue-600 hover:underline">
            Clear filters
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-max text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Grade</th>
              <th className="px-4 py-2">Subject</th>
              <th className="px-4 py-2">Balance</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2 font-medium">
                  <Link href={`/admin/students/${s.id}`} className="hover:underline">
                    {s.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-500">{s.email}</td>
                <td className="px-4 py-2">
                  <GradeEditor studentId={s.id} grade={s.grade} grades={grades} />
                </td>
                <td className="px-4 py-2">
                  <SubjectEditor
                    studentId={s.id}
                    studentSubjects={s.subjects.map((x) => x.subject)}
                    subjects={subjects}
                  />
                </td>
                <td className="px-4 py-2">{balanceByStudent.get(s.id) ?? 0} pts</td>
                <td className="px-4 py-2">
                  <Link href={`/admin/students/${s.id}`} className="text-blue-600 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && (
          <p className="p-4 text-sm text-gray-500">No students match these filters.</p>
        )}
      </div>
    </div>
  );
}
