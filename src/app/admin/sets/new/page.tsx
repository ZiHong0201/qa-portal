import { SetForm } from "../set-form";
import { createQuestionSet } from "@/lib/actions/questionSets";
import { getGradeNames } from "@/lib/grades";
import { getSubjectNames } from "@/lib/subjects";

export default async function NewQuestionSetPage() {
  const [grades, subjects] = await Promise.all([getGradeNames(), getSubjectNames()]);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">New question set</h1>
      <SetForm action={createQuestionSet} grades={grades} subjects={subjects} submitLabel="Create set" />
    </div>
  );
}
