import { SetForm } from "../set-form";
import { createQuestionSet } from "@/lib/actions/questionSets";
import { getGradeNames } from "@/lib/grades";
import { getSubjectNames } from "@/lib/subjects";
import { canEditSubject, currentEditableSubjects } from "@/lib/permissions";
import { SubjectAccessNote } from "../subject-access-note";

export default async function NewQuestionSetPage() {
  const [grades, allSubjects, editable] = await Promise.all([
    getGradeNames(),
    getSubjectNames(),
    currentEditableSubjects(),
  ]);
  // A teacher creates sets only in their own subjects.
  const subjects = allSubjects.filter((s) => canEditSubject(editable, s));

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">New question set</h1>
      {editable !== null && editable.length === 0 ? (
        <SubjectAccessNote editable={editable} />
      ) : (
        <SetForm action={createQuestionSet} grades={grades} subjects={subjects} submitLabel="Create set" />
      )}
    </div>
  );
}
