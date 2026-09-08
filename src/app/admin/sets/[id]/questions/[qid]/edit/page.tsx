import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { QuestionForm } from "../../question-form";
import { updateQuestion } from "@/lib/actions/questions";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string; qid: string }>;
}) {
  const { id, qid } = await params;
  const question = await prisma.question.findUnique({
    where: { id: qid },
    include: { choices: { orderBy: { order: "asc" } } },
  });
  if (!question || question.questionSetId !== id) notFound();

  const action = updateQuestion.bind(null, question.id);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Edit question</h1>
      <QuestionForm
        action={action}
        submitLabel="Save changes"
        initial={{
          body: question.body,
          points: question.points,
          explanation: question.explanation,
          diagramUrl: question.diagramUrl,
          choices: question.choices.map((c) => ({ text: c.text, isCorrect: c.isCorrect })),
        }}
      />
    </div>
  );
}
