import { prisma } from "@/lib/prisma";
import { createGrade, createSubject, deleteGrade, deleteSubject } from "@/lib/actions/masterData";
import { AddForm } from "./add-form";

export default async function MasterDataPage() {
  const [grades, subjects] = await Promise.all([
    prisma.grade.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  const [setGradeCounts, studentGradeCounts, setSubjectCounts, studentSubjectCounts] =
    await Promise.all([
      prisma.questionSet.groupBy({ by: ["grade"], _count: true }),
      prisma.user.groupBy({ by: ["grade"], where: { role: "STUDENT" }, _count: true }),
      prisma.questionSet.groupBy({ by: ["subject"], _count: true }),
      prisma.studentSubject.groupBy({ by: ["subject"], _count: true }),
    ]);

  function usageFor(
    name: string,
    setCounts: { grade?: string | null; subject?: string | null; _count: number }[],
    studentCounts: { grade?: string | null; subject?: string | null; _count: number }[],
    key: "grade" | "subject"
  ) {
    const sets = setCounts.find((c) => c[key] === name)?._count ?? 0;
    const students = studentCounts.find((c) => c[key] === name)?._count ?? 0;
    return sets + students;
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Master data</h1>
      <p className="mb-6 text-sm text-gray-500">
        Manage the grades and subjects available when creating question sets and student
        accounts.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 font-medium">Grades</h2>
          <ul className="mb-4 flex flex-col gap-2">
            {grades.map((g) => {
              const inUse = usageFor(g.name, setGradeCounts, studentGradeCounts, "grade");
              return (
                <li
                  key={g.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
                >
                  <span>{g.name}</span>
                  {inUse === 0 ? (
                    <form action={deleteGrade.bind(null, g.id)}>
                      <button type="submit" className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-gray-400">in use</span>
                  )}
                </li>
              );
            })}
            {grades.length === 0 && <p className="text-sm text-gray-500">No grades yet.</p>}
          </ul>
          <AddForm action={createGrade} placeholder="e.g. Form 6" buttonLabel="Add grade" />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 font-medium">Subjects</h2>
          <ul className="mb-4 flex flex-col gap-2">
            {subjects.map((s) => {
              const inUse = usageFor(s.name, setSubjectCounts, studentSubjectCounts, "subject");
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
                >
                  <span>{s.name}</span>
                  {inUse === 0 ? (
                    <form action={deleteSubject.bind(null, s.id)}>
                      <button type="submit" className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-gray-400">in use</span>
                  )}
                </li>
              );
            })}
            {subjects.length === 0 && <p className="text-sm text-gray-500">No subjects yet.</p>}
          </ul>
          <AddForm action={createSubject} placeholder="e.g. Mathematics" buttonLabel="Add subject" />
        </div>
      </div>
    </div>
  );
}
