"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuspended, suspendedError } from "@/lib/suspension";
import { getUiLang } from "@/lib/i18n.server";
import { rollRare } from "@/lib/study-pet.server";
import { isElement, PET_NAME_MAX_LENGTH, STAGE_GROWTH } from "@/lib/study-pet";
import { petText as t } from "@/lib/text/pet";

export type PetActionState = { error?: string; success?: string };

async function requireStudent(): Promise<{ error: string } | { studentId: string }> {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") return { error: t.mustBeStudent };
  if (await isSuspended(session.user.id)) return { error: suspendedError(await getUiLang()) };
  return { studentId: session.user.id };
}

/**
 * Picks the egg's element. Once only: the choice is meant to matter, so a
 * second pick is refused rather than quietly overwriting the first.
 */
export async function chooseElement(
  _prev: PetActionState,
  formData: FormData
): Promise<PetActionState> {
  const guard = await requireStudent();
  if ("error" in guard) return guard;

  const element = formData.get("element");
  if (!isElement(element)) return { error: t.badElement };

  const existing = await prisma.studyPet.findUnique({
    where: { ownerId: guard.studentId },
    select: { element: true },
  });
  if (existing?.element) return { error: t.alreadyPicked };

  // The row usually exists already - the first correct answer creates it -
  // but a student who opens the pet page before answering anything has none.
  // updateMany with element: null keeps a double submit from picking twice.
  if (existing) {
    await prisma.studyPet.updateMany({
      where: { ownerId: guard.studentId, element: null },
      data: { element },
    });
  } else {
    await prisma.studyPet.create({
      data: { ownerId: guard.studentId, element, rare: rollRare() },
    });
  }

  // Every decorative pet in the portal changes with it.
  revalidatePath("/dashboard", "layout");
  return {};
}

function nameSchema() {
  return z
    .string()
    .trim()
    .min(1, t.nameRequired)
    .max(PET_NAME_MAX_LENGTH, t.nameTooLong(PET_NAME_MAX_LENGTH));
}

/** Names the egg, which is the moment it hatches. */
export async function hatchPet(
  _prev: PetActionState,
  formData: FormData
): Promise<PetActionState> {
  const guard = await requireStudent();
  if ("error" in guard) return guard;

  const parsed = nameSchema().safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const pet = await prisma.studyPet.findUnique({
    where: { ownerId: guard.studentId },
    select: { element: true, name: true, growth: true },
  });
  if (!pet?.element) return { error: t.pickFirst };
  if (pet.name) return { error: t.alreadyHatched };
  if (pet.growth < STAGE_GROWTH.hatchling) return { error: t.notReady };

  await prisma.studyPet.updateMany({
    where: { ownerId: guard.studentId, name: null },
    data: { name: parsed.data, hatchedAt: new Date() },
  });

  revalidatePath("/dashboard", "layout");
  return { success: t.hatched(parsed.data) };
}
