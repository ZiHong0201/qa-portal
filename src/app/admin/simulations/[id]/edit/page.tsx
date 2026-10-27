import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canEditSubject, currentEditableSubjects } from "@/lib/permissions";
import { SimulationForm } from "../../simulation-form";
import { getChapterNames } from "../../chapters";
import { updateSimulation } from "@/lib/actions/simulations";
import { getGradeNames } from "@/lib/grades";
import { getSubjectNames } from "@/lib/subjects";

export default async function EditSimulationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [simulation, grades, allSubjects, chapters, editable] = await Promise.all([
    prisma.simulation.findUnique({ where: { id }, include: { grades: true } }),
    getGradeNames(),
    getSubjectNames(),
    getChapterNames(),
    currentEditableSubjects(),
  ]);
  if (!simulation) notFound();
  if (!canEditSubject(editable, simulation.subject)) redirect("/admin/simulations");
  // It can only be moved into a subject the teacher also has.
  const subjects = allSubjects.filter((s) => canEditSubject(editable, s));

  const action = updateSimulation.bind(null, simulation.id);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Edit simulation</h1>
      <SimulationForm
        action={action}
        grades={grades}
        subjects={subjects}
        chapters={chapters}
        submitLabel="Save changes"
        initial={{
          title: simulation.title,
          description: simulation.description,
          grades: simulation.grades.map((g) => g.grade),
          subject: simulation.subject,
          chapter: simulation.chapter,
          topicCode: simulation.topicCode,
          url: simulation.url,
          urlMs: simulation.urlMs,
        }}
      />
    </div>
  );
}
