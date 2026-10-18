import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NewStudentForm } from "../../student-forms";

export default async function NewStudentPage() {
  const [grades, subjects] = await Promise.all([
    prisma.grade.findMany({ orderBy: { order: "asc" }, select: { name: true } }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  return (
    <div className="max-w-xl">
      <Link href="/payment/students" className="text-sm text-teal-700 hover:underline">
        &larr; Students
      </Link>
      <h1 className="mt-1 mb-1 text-2xl font-bold text-stone-900">Add student</h1>
      <p className="mb-5 text-sm text-gray-600">
        Creates their exercise portal account. They see question sets for their grade and the subjects ticked here.
      </p>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <NewStudentForm grades={grades.map((g) => g.name)} subjects={subjects.map((s) => s.name)} />
      </div>
    </div>
  );
}
