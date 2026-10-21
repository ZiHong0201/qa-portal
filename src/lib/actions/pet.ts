"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuspended, suspendedError } from "@/lib/suspension";
import { getStudentBalance } from "@/lib/points";
import { petAccess } from "@/lib/pet.server";
import { currentStats, applyEffect, AVAILABLE_COATS, PET_NAME_MAX_LENGTH } from "@/lib/pet";
import { getUiLang } from "@/lib/i18n.server";
import { rewardsText } from "@/lib/text/rewards";

export type PetActionState = { error?: string; success?: string };

type PetText = (typeof rewardsText)["en"]["pet"];

/**
 * Who may play, plus the text to answer in - every message these actions
 * send back is read by the student, so it comes in their chosen language.
 */
async function requirePetStudent(): Promise<{ error: string } | { studentId: string; t: PetText }> {
  const lang = await getUiLang();
  const t = rewardsText[lang].pet;
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") {
    return { error: t.mustBeStudent };
  }
  if (await isSuspended(session.user.id)) {
    return { error: suspendedError(lang) };
  }
  if (!(await petAccess(session.user.id))) {
    return { error: t.notOnAccount };
  }
  return { studentId: session.user.id, t };
}

function adoptSchema(t: PetText) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t.nameRequired)
      .max(PET_NAME_MAX_LENGTH, t.nameTooLong(PET_NAME_MAX_LENGTH)),
    coat: z
      .string()
      .refine((c) => AVAILABLE_COATS.some((x) => x.key === c), t.colourUnavailable),
  });
}

export async function adoptPet(
  _prev: PetActionState,
  formData: FormData
): Promise<PetActionState> {
  const guard = await requirePetStudent();
  if ("error" in guard) return guard;
  const { t } = guard;

  const parsed = adoptSchema(t).safeParse({
    name: formData.get("name"),
    coat: formData.get("coat"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await prisma.pet.findUnique({ where: { ownerId: guard.studentId } });
  if (existing) return { error: t.alreadyHaveCat };

  // Adoption is free on purpose - the points go on looking after it.
  await prisma.pet.create({
    data: {
      ownerId: guard.studentId,
      name: parsed.data.name,
      coat: parsed.data.coat,
      hunger: 80,
      happiness: 90,
      statsAt: new Date(),
    },
  });

  // A new cat re-themes every decorative cat on the dashboard at once.
  revalidatePath("/dashboard", "layout");
  return { success: t.welcomeHome };
}

/**
 * Buys an item and applies it. Clothing is kept and worn; food and snacks are
 * eaten straight away and never stored.
 *
 * The balance is re-read inside the transaction and the write is conditional,
 * so two quick taps cannot spend the same points twice.
 */
export async function buyPetItem(itemId: string): Promise<PetActionState> {
  const guard = await requirePetStudent();
  if ("error" in guard) return guard;
  const { studentId, t } = guard;

  const [pet, item] = await Promise.all([
    prisma.pet.findUnique({ where: { ownerId: studentId } }),
    prisma.petItem.findUnique({ where: { id: itemId } }),
  ]);
  if (!pet) return { error: t.adoptFirst };
  if (!item || !item.isActive) return { error: t.itemUnavailable };

  if (item.kind === "CLOTHING") {
    const already = await prisma.petOwnedItem.findUnique({
      where: { petId_itemId: { petId: pet.id, itemId: item.id } },
    });
    if (already) return { error: t.alreadyOwns(pet.name) };
  }

  const { balance } = await getStudentBalance(studentId);
  if (balance < item.cost) {
    return { error: t.cannotAfford(item.name, item.cost, balance) };
  }

  await prisma.$transaction(async (tx) => {
    await tx.petPurchase.create({
      data: { studentId, petId: pet.id, itemId: item.id, cost: item.cost },
    });

    if (item.kind === "CLOTHING") {
      // Wearing it immediately is what the student expects after buying it;
      // anything already in that slot comes off.
      if (item.slot) {
        await tx.petOwnedItem.updateMany({
          where: { petId: pet.id, equipped: true, item: { slot: item.slot } },
          data: { equipped: false },
        });
      }
      await tx.petOwnedItem.create({
        data: { petId: pet.id, itemId: item.id, equipped: true },
      });
    } else {
      // Food and snacks act on the stats as they stand right now, after decay.
      const next = applyEffect(currentStats(pet), {
        hunger: item.hungerEffect,
        happiness: item.happinessEffect,
      });
      await tx.pet.update({
        where: { id: pet.id },
        data: { hunger: next.hunger, happiness: next.happiness, statsAt: new Date() },
      });
    }
  });

  revalidatePath("/dashboard", "layout");

  return {
    success:
      item.kind === "CLOTHING" ? t.wearing(pet.name, item.name) : t.enjoyed(pet.name, item.name),
  };
}

/** Puts a piece of owned clothing on, or takes it off. */
export async function togglePetItem(ownedId: string): Promise<PetActionState> {
  const guard = await requirePetStudent();
  if ("error" in guard) return guard;

  const owned = await prisma.petOwnedItem.findUnique({
    where: { id: ownedId },
    include: { item: true, pet: true },
  });
  // Checking ownership here is what stops one student dressing another's cat.
  if (!owned || owned.pet.ownerId !== guard.studentId) {
    return { error: guard.t.notYours };
  }

  await prisma.$transaction(async (tx) => {
    if (!owned.equipped && owned.item.slot) {
      await tx.petOwnedItem.updateMany({
        where: { petId: owned.petId, equipped: true, item: { slot: owned.item.slot } },
        data: { equipped: false },
      });
    }
    await tx.petOwnedItem.update({
      where: { id: owned.id },
      data: { equipped: !owned.equipped },
    });
  });

  // The coat and accessories theme the decorative cats across the whole
  // dashboard, so the layout has to be rebuilt too - revalidating just this
  // page leaves the companion and the celebration cat in the old outfit.
  revalidatePath("/dashboard", "layout");
  return {};
}

/** A free fuss. Small, capped, and rate-limited by its own modest effect. */
export async function pettingSession(): Promise<PetActionState> {
  const guard = await requirePetStudent();
  if ("error" in guard) return guard;

  const { t } = guard;

  const pet = await prisma.pet.findUnique({ where: { ownerId: guard.studentId } });
  if (!pet) return { error: t.adoptFirst };

  const stats = currentStats(pet);
  // Free attention tops up a little, but only to a point - a cat that has
  // been ignored for days cannot be fixed by clicking, it wants feeding.
  if (stats.happiness >= 60) {
    return { success: t.plentyOfFuss(pet.name) };
  }

  const next = applyEffect(stats, { happiness: 6 });
  await prisma.pet.update({
    where: { id: pet.id },
    data: { happiness: next.happiness, hunger: stats.hunger, statsAt: new Date() },
  });

  revalidatePath("/dashboard", "layout");
  return { success: t.purrs(pet.name) };
}

const renameSchema = z.string().trim().min(1).max(PET_NAME_MAX_LENGTH);

export async function renamePet(
  _prev: PetActionState,
  formData: FormData
): Promise<PetActionState> {
  const guard = await requirePetStudent();
  if ("error" in guard) return guard;

  const parsed = renameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: guard.t.renameLength(PET_NAME_MAX_LENGTH) };
  }

  await prisma.pet.update({
    where: { ownerId: guard.studentId },
    data: { name: parsed.data },
  });

  revalidatePath("/dashboard", "layout");
  return { success: guard.t.renamed };
}
