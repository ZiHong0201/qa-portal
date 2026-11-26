import Link from "next/link";
import Form from "next/form";
import { prisma } from "@/lib/prisma";
import { GradeEditor } from "./grade-editor";
import { SubjectEditor } from "./subject-editor";
import { CentreEditor } from "./centre-editor";
import { auth } from "@/auth";
import { studentsIn, visibleCentreIds } from "@/lib/permissions";
import { centresWithin, getCentres } from "@/lib/centres";
import type { Session } from "next-auth";
import { getGradeNames } from "@/lib/grades";
import { getSubjectNames } from "@/lib/subjects";
import type { Prisma } from "@/generated/prisma/client";

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    deleted?: string;
    grade?: string;
    subject?: string;
    q?: string;
    centre?: string;
  }>;
}) {
  const { created, deleted, grade, subject, q, centre } = await searchParams;

  // The layout lets only staff in. A teacher sees their own centres' students;
  // an admin sees everyone, and can pick out those with no centre yet.
  const session = (await auth()) as Session;
  const visible = await visibleCentreIds(session);
  const isAdminView = visible === null;
  const centres = centresWithin(await getCentres(), visible);

  const where: Prisma.UserWhereInput = studentsIn(visible);
  const filters: Prisma.UserWhereInput[] = [where];
  if (centre === "none" && isAdminView) filters.push({ centreId: null });
  else if (centre && centres.some((c) => c.id === centre)) filters.push({ centreId: centre });
  if (grade) where.grade = grade;
  if (subject) where.subjects = { some: { subject } };
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
    ];
  }

  const [
    students,
    grades,
    subjects,
    earnedRows,
    checkInRows,
    adjustmentRows,
    redeemedRows,
    requestCount,
    unassignedCount,
  ] = await Promise.all([
      prisma.user.findMany({
        where: { AND: filters },
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
      prisma.checkIn.groupBy({ by: ["studentId"], _sum: { pointsAwarded: true } }),
      prisma.pointAdjustment.groupBy({ by: ["studentId"], _sum: { amount: true } }),
      // Rejected exchanges were refunded, so they are not spending.
      prisma.redemption.groupBy({
        by: ["studentId"],
        where: { rejectedAt: null },
        _sum: { cost: true },
      }),
      // A teacher sees the requests naming one of their centres; the rest
      // wait for an admin.
      prisma.accountRequest.count({ where: isAdminView ? {} : { centreId: { in: visible } } }),
      // Only an admin sees these students, so only an admin is told about them.
      isAdminView && centres.length > 0 ? prisma.user.count({ where: { role: "STUDENT", centreId: null } }) : 0,
    ]);

  // Mirrors getStudentBalance(), batched across students instead of per-row.
  const balanceByStudent = new Map<string, number>();
  for (const s of students) {
    const earned = earnedRows.find((r) => r.studentId === s.id)?._sum.pointsAwarded ?? 0;
    const checkIns = checkInRows.find((r) => r.studentId === s.id)?._sum.pointsAwarded ?? 0;
    const adjustments = adjustmentRows.find((r) => r.studentId === s.id)?._sum.amount ?? 0;
    const redeemed = redeemedRows.find((r) => r.studentId === s.id)?._sum.cost ?? 0;
    balanceByStudent.set(s.id, earned + checkIns + adjustments - redeemed);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/students/requests"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 hover:bg-gray-50"
          >
            Requests
            {requestCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
                {requestCount}
              </span>
            )}
          </Link>
          <Link
            href="/admin/students/new"
            className="rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
          >
            + New student
          </Link>
        </div>
      </div>
      {requestCount > 0 && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {requestCount === 1 ? "1 account request is" : `${requestCount} account requests are`} waiting.{" "}
          <Link href="/admin/students/requests" className="font-medium underline">
            Review
          </Link>
        </p>
      )}
      {unassignedCount > 0 && centre !== "none" && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {unassignedCount === 1 ? "1 student has" : `${unassignedCount} students have`} no centre yet. They
          are on no centre&apos;s scoreboard and only admins can see them.{" "}
          <Link href="/admin/students?centre=none" className="font-medium underline">
            Show them
          </Link>
        </p>
      )}
      {created && (
        <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Student account created.
        </p>
      )}
      {deleted && (
        <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Student account deleted.
        </p>
      )}

      <Form action="/admin/students" className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
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
        {(centres.length > 1 || (isAdminView && centres.length > 0)) && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500" htmlFor="centre">
              Centre
            </label>
            <select
              id="centre"
              name="centre"
              defaultValue={centre ?? ""}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            >
              <option value="">All centres</option>
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              {isAdminView && <option value="none">Unassigned</option>}
            </select>
          </div>
        )}
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
          className="rounded-md bg-sky-600 px-4 py-1.5 text-sm text-white hover:bg-sky-700"
        >
          Filter
        </button>
        {(grade || subject || q || centre) && (
          <Link href="/admin/students" className="text-sm text-blue-600 hover:underline">
            Clear filters
          </Link>
        )}
      </Form>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-max text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              {centres.length > 0 && <th className="px-4 py-2">Centre</th>}
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
                  {s.suspendedAt && (
                    <span
                      className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700"
                      title={s.suspensionReason ?? undefined}
                    >
                      Suspended
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-gray-500">{s.email}</td>
                {centres.length > 0 && (
                  <td className="px-4 py-2">
                    <CentreEditor
                      studentId={s.id}
                      centreId={s.centreId}
                      centres={centres}
                      allowNone={isAdminView}
                    />
                  </td>
                )}
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
                <td className="px-4 py-2 whitespace-nowrap">
                  <Link href={`/admin/students/${s.id}`} className="text-blue-600 hover:underline">
                    View
                  </Link>{" "}
                  ·{" "}
                  <Link
                    href={`/admin/students/${s.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
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
