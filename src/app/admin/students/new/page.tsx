import { StudentForm } from "./student-form";
import { createStudent } from "@/lib/actions/students";
import { getGradeNames } from "@/lib/grades";
import { getSubjectNames } from "@/lib/subjects";

export default async function NewStudentPage() {
  const [grades, subjects] = await Promise.all([getGradeNames(), getSubjectNames()]);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">New student account</h1>
      <StudentForm
        action={createStudent}
        grades={grades}
        subjects={subjects}
        submitLabel="Create student account"
      />
    </div>
  );
}
