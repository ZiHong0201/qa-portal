import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canEditSubject, currentEditableSubjects } from "@/lib/permissions";
import { QuestionForm } from "../question-form";
import { createQuestion } from "@/lib/actions/questions";

export default async function NewQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [set, editable] = await Promise.all([
    prisma.questionSet.findUnique({ where: { id } }),
    currentEditableSubjects(),
  ]);
  if (!set) notFound();
  if (!canEditSubject(editable, set.subject)) redirect(`/admin/sets/${set.id}`);

  const action = createQuestion.bind(null, set.id);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-bold">New question</h1>
      <p className="mb-6 text-sm text-gray-500">In &ldquo;{set.title}&rdquo;</p>
      <QuestionForm action={action} submitLabel="Create question" />
    </div>
  );
}
