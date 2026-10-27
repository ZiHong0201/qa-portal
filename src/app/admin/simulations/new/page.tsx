import { SimulationForm } from "../simulation-form";
import { getChapterNames } from "../chapters";
import { createSimulation } from "@/lib/actions/simulations";
import { getGradeNames } from "@/lib/grades";
import { getSubjectNames } from "@/lib/subjects";
import { canEditSubject, currentEditableSubjects } from "@/lib/permissions";
import { SubjectAccessNote } from "../../sets/subject-access-note";

export default async function NewSimulationPage() {
  const [grades, allSubjects, chapters, editable] = await Promise.all([
    getGradeNames(),
    getSubjectNames(),
    getChapterNames(),
    currentEditableSubjects(),
  ]);
  // A teacher adds simulations only in their own subjects.
  const subjects = allSubjects.filter((s) => canEditSubject(editable, s));

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">New simulation</h1>
      {editable !== null && editable.length === 0 ? (
        <SubjectAccessNote editable={editable} />
      ) : (
        <SimulationForm
          action={createSimulation}
          grades={grades}
          subjects={subjects}
          chapters={chapters}
          submitLabel="Add simulation"
        />
      )}
    </div>
  );
}
