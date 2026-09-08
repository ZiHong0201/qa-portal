import { StudentForm } from "./student-form";
import { getGradeNames } from "@/lib/grades";
import { getSubjectNames } from "@/lib/subjects";

export default async function NewStudentPage() {
  const [grades, subjects] = await Promise.all([getGradeNames(), getSubjectNames()]);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">New student account</h1>
      <StudentForm grades={grades} subjects={subjects} />
    </div>
  );
}
