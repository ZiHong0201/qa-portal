import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { importQuestionsFromFile } from "@/lib/actions/importQuestions";
import { ImportForm } from "./import-form";

export default async function ImportQuestionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const set = await prisma.questionSet.findUnique({ where: { id } });
  if (!set) notFound();

  const action = importQuestionsFromFile.bind(null, set.id);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-bold">Import from exam paper</h1>
      <p className="mb-6 text-sm text-gray-500">Into &ldquo;{set.title}&rdquo;</p>
      <ImportForm action={action} />
    </div>
  );
}
