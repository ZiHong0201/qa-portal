import { StudentForm } from "./student-form";
import { createStudent } from "@/lib/actions/students";
import { getGradeNames } from "@/lib/grades";
import { getSubjectNames } from "@/lib/subjects";
import { getCentres, centresWithin } from "@/lib/centres";
import { currentVisibleCentreIds } from "@/lib/permissions";

export default async function NewStudentPage() {
  const [grades, subjects, allCentres, visible] = await Promise.all([
    getGradeNames(),
    getSubjectNames(),
    getCentres(),
    currentVisibleCentreIds(),
  ]);
  const centres = centresWithin(allCentres, visible);

  // A teacher's students go in one of their centres, so a teacher without one
  // has nowhere to put a new student.
  if (visible !== null && centres.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-bold">New student account</h1>
        <p className="rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          You haven&apos;t been given a centre yet. Ask an admin to add one to your account.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">New student account</h1>
      <StudentForm
        action={createStudent}
        grades={grades}
        subjects={subjects}
        centres={centres}
        allowNoCentre={visible === null}
        submitLabel="Create student account"
      />
    </div>
  );
}
