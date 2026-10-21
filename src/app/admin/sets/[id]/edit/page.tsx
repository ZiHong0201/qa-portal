import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canEditSubject, currentEditableSubjects } from "@/lib/permissions";
import { SetForm } from "../../set-form";
import { updateQuestionSet } from "@/lib/actions/questionSets";
import { getGradeNames } from "@/lib/grades";
import { getSubjectNames } from "@/lib/subjects";

export default async function EditQuestionSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [set, grades, allSubjects, editable] = await Promise.all([
    prisma.questionSet.findUnique({ where: { id }, include: { grades: true } }),
    getGradeNames(),
    getSubjectNames(),
    currentEditableSubjects(),
  ]);
  if (!set) notFound();
  if (!canEditSubject(editable, set.subject)) redirect(`/admin/sets/${set.id}`);
  // A set can only be moved into a subject the teacher also has.
  const subjects = allSubjects.filter((s) => canEditSubject(editable, s));

  const action = updateQuestionSet.bind(null, set.id);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Edit question set</h1>
      <SetForm
        action={action}
        grades={grades}
        subjects={subjects}
        submitLabel="Save changes"
        initial={{
          title: set.title,
          description: set.description,
          grades: set.grades.map((g) => g.grade),
          subject: set.subject,
          simulationUrl: set.simulationUrl,
          bilingual: set.bilingual,
        }}
      />
    </div>
  );
}
