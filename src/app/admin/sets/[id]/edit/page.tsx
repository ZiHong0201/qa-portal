import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
  const [set, grades, subjects] = await Promise.all([
    prisma.questionSet.findUnique({ where: { id }, include: { grades: true } }),
    getGradeNames(),
    getSubjectNames(),
  ]);
  if (!set) notFound();

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
        }}
      />
    </div>
  );
}
