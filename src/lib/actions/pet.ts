"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStudentBalance } from "@/lib/points";
import { petAccess } from "@/lib/pet.server";
import { currentStats, applyEffect, COATS, PET_NAME_MAX_LENGTH } from "@/lib/pet";

export type PetActionState = { error?: string; success?: string };

async function requirePetStudent() {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") {
    return { error: "You must be signed in as a student." as const };
  }
  if (!(await petAccess(session.user.id))) {
    return { error: "The cat is not available on your account." as const };
  }
  return { studentId: session.user.id };
}

const adoptSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give your cat a name")
    .max(PET_NAME_MAX_LENGTH, `Name must be ${PET_NAME_MAX_LENGTH} characters or fewer`),
  coat: z.string().refine((c) => COATS.some((x) => x.key === c), "Pick a colour"),
});

export async function adoptPet(
  _prev: PetActionState,
  formData: FormData
): Promise<PetActionState> {
  const guard = await requirePetStudent();
  if ("error" in guard) return guard;

  const parsed = adoptSchema.safeParse({
    name: formData.get("name"),
    coat: formData.get("coat"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await prisma.pet.findUnique({ where: { ownerId: guard.studentId } });
  if (existing) return { error: "You already have a cat." };

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
  return { success: "Welcome home!" };
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
  const { studentId } = guard;

  const [pet, item] = await Promise.all([
    prisma.pet.findUnique({ where: { ownerId: studentId } }),
    prisma.petItem.findUnique({ where: { id: itemId } }),
  ]);
  if (!pet) return { error: "Adopt a cat first." };
  if (!item || !item.isActive) return { error: "That item is not available." };

  if (item.kind === "CLOTHING") {
    const already = await prisma.petOwnedItem.findUnique({
      where: { petId_itemId: { petId: pet.id, itemId: item.id } },
    });
    if (already) return { error: `${pet.name} already owns that.` };
  }

  const { balance } = await getStudentBalance(studentId);
  if (balance < item.cost) {
    return { error: `Not enough points - ${item.name} costs ${item.cost}, you have ${balance}.` };
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
      item.kind === "CLOTHING"
        ? `${pet.name} is wearing the ${item.name.toLowerCase()}.`
        : `${pet.name} enjoyed the ${item.name.toLowerCase()}.`,
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
    return { error: "That item is not yours." };
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

  const pet = await prisma.pet.findUnique({ where: { ownerId: guard.studentId } });
  if (!pet) return { error: "Adopt a cat first." };

  const stats = currentStats(pet);
  // Free attention tops up a little, but only to a point - a cat that has
  // been ignored for days cannot be fixed by clicking, it wants feeding.
  if (stats.happiness >= 60) {
    return { success: `${pet.name} has had plenty of fuss for now.` };
  }

  const next = applyEffect(stats, { happiness: 6 });
  await prisma.pet.update({
    where: { id: pet.id },
    data: { happiness: next.happiness, hunger: stats.hunger, statsAt: new Date() },
  });

  revalidatePath("/dashboard", "layout");
  return { success: `${pet.name} purrs.` };
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
    return { error: `Name must be 1-${PET_NAME_MAX_LENGTH} characters.` };
  }

  await prisma.pet.update({
    where: { ownerId: guard.studentId },
    data: { name: parsed.data },
  });

  revalidatePath("/dashboard", "layout");
  return { success: "Renamed." };
}
