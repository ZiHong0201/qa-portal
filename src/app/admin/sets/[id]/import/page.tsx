import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canEditSubject, currentEditableSubjects } from "@/lib/permissions";
import { importQuestionsFromFile } from "@/lib/actions/importQuestions";
import { ImportForm } from "./import-form";

export default async function ImportQuestionsPage({
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

  const action = importQuestionsFromFile.bind(null, set.id);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-bold">Import from exam paper</h1>
      <p className="mb-6 text-sm text-gray-500">Into &ldquo;{set.title}&rdquo;</p>
      <ImportForm action={action} />
    </div>
  );
}
