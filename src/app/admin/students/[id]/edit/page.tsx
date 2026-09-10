import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StudentForm } from "../../new/student-form";
import { updateStudent } from "@/lib/actions/students";
import { getGradeNames } from "@/lib/grades";
import { getSubjectNames } from "@/lib/subjects";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [student, grades, subjects] = await Promise.all([
    prisma.user.findFirst({
      where: { id, role: "STUDENT" },
      include: { subjects: true },
    }),
    getGradeNames(),
    getSubjectNames(),
  ]);
  if (!student) notFound();

  const action = updateStudent.bind(null, student.id);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Edit student account</h1>
      <StudentForm
        action={action}
        grades={grades}
        subjects={subjects}
        submitLabel="Save changes"
        initial={{
          name: student.name,
          email: student.email,
          grade: student.grade,
          subjects: student.subjects.map((s) => s.subject),
        }}
      />
    </div>
  );
}
