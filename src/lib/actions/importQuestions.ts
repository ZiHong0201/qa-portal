"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractFromDocx, extractFromPdf, type ExtractedQuestion } from "@/lib/examImport";
import type { FormState } from "./auth";

const MAX_FILE_SIZE = 30 * 1024 * 1024;

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}

export async function importQuestionsFromFile(
  setId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdmin();

  const set = await prisma.questionSet.findUnique({ where: { id: setId } });
  if (!set) return { error: "Question set not found." };

  const file = formData.get("examFile");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PDF or Word (.docx) file." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "That file is too large (max 30MB)." };
  }

  const defaultMarksRaw = Number(formData.get("defaultMarks"));
  const defaultMarks =
    Number.isFinite(defaultMarksRaw) && defaultMarksRaw > 0 ? Math.round(defaultMarksRaw) : 10;

  const buffer = Buffer.from(await file.arrayBuffer());

  let extracted: ExtractedQuestion[];
  try {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      extracted = await extractFromPdf(buffer, defaultMarks);
    } else if (file.type === DOCX_MIME || file.name.toLowerCase().endsWith(".docx")) {
      extracted = await extractFromDocx(buffer, defaultMarks);
    } else {
      return { error: "Unsupported file type. Upload a PDF or Word (.docx) file." };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not process that file." };
  }

  if (extracted.length === 0) {
    return { error: "No multiple-choice questions could be found in that file." };
  }

  await prisma.$transaction(
    extracted.map((q) =>
      prisma.question.create({
        data: {
          body: q.body,
          points: q.marks,
          explanation: q.explanation,
          type: "MULTIPLE_CHOICE",
          isActive: false,
          questionSetId: setId,
          createdById: session.user.id,
          choices: {
            create: q.options.map((text, i) => ({
              text,
              isCorrect: q.correctIndex !== null ? i === q.correctIndex : i === 0,
              order: i,
            })),
          },
        },
      })
    )
  );

  revalidatePath(`/admin/sets/${setId}`);
  redirect(`/admin/sets/${setId}?imported=${extracted.length}`);
}
