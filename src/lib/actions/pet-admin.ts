"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { clothingKeys } from "@/components/pet-cat";
import { treatKeys } from "@/components/pet-treat";
import type { FormState } from "./auth";


/** Turns the cat on or off for one student. */
export async function setPetAccess(studentId: string, enabled: boolean) {
  await requireAdmin();
  await prisma.user.update({ where: { id: studentId }, data: { petEnabled: enabled } });
  revalidatePath("/admin/pet");
  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
}

const itemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  kind: z.enum(["CLOTHING", "FOOD", "SNACK"]),
  key: z.string().trim().min(1, "Artwork is required").max(60),
  cost: z.coerce.number().int().min(0).max(100_000),
  hungerEffect: z.coerce.number().int().min(0).max(100),
  happinessEffect: z.coerce.number().int().min(0).max(100),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  isActive: z.coerce.boolean().optional(),
});

function readItem(formData: FormData) {
  return itemSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    key: formData.get("key"),
    cost: formData.get("cost"),
    hungerEffect: formData.get("hungerEffect") || 0,
    happinessEffect: formData.get("happinessEffect") || 0,
    sortOrder: formData.get("sortOrder") || 0,
    isActive: formData.get("isActive") ?? false,
  });
}

/**
 * Every item must name artwork the renderer knows how to draw - a garment for
 * clothing, a treat picture for food and snacks. Otherwise a student could buy
 * a hat that never appears, or feed the cat something that animates as a blank
 * bowl.
 */
function validateArtwork(kind: string, key: string): string | null {
  const allowed = kind === "CLOTHING" ? clothingKeys() : treatKeys();
  if (allowed.includes(key)) return null;
  return kind === "CLOTHING"
    ? `"${key}" is not a garment the cat can wear. Pick one from the list.`
    : `"${key}" has no treat artwork. Pick one from the list.`;
}

export async function createPetItem(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = readItem(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const artworkError = validateArtwork(d.kind, d.key);
  if (artworkError) return { error: artworkError };

  const clash = await prisma.petItem.findUnique({ where: { key: d.key } });
  if (clash) return { error: `An item already uses the key "${d.key}".` };

  await prisma.petItem.create({
    data: {
      name: d.name,
      kind: d.kind,
      key: d.key,
      // The slot comes from the artwork, not the admin - it is a property of
      // where the garment is drawn, not an editorial choice.
      slot: d.kind === "CLOTHING" ? slotForKey(d.key) : null,
      cost: d.cost,
      hungerEffect: d.kind === "CLOTHING" ? 0 : d.hungerEffect,
      happinessEffect: d.kind === "CLOTHING" ? 0 : d.happinessEffect,
      sortOrder: d.sortOrder,
      isActive: d.isActive ?? false,
    },
  });

  revalidatePath("/admin/pet");
  redirect("/admin/pet");
}

export async function updatePetItem(
  id: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const parsed = readItem(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const artworkError = validateArtwork(d.kind, d.key);
  if (artworkError) return { error: artworkError };

  const clash = await prisma.petItem.findUnique({ where: { key: d.key } });
  if (clash && clash.id !== id) return { error: `An item already uses the key "${d.key}".` };

  await prisma.petItem.update({
    where: { id },
    data: {
      name: d.name,
      kind: d.kind,
      key: d.key,
      slot: d.kind === "CLOTHING" ? slotForKey(d.key) : null,
      cost: d.cost,
      hungerEffect: d.kind === "CLOTHING" ? 0 : d.hungerEffect,
      happinessEffect: d.kind === "CLOTHING" ? 0 : d.happinessEffect,
      sortOrder: d.sortOrder,
      isActive: d.isActive ?? false,
    },
  });

  revalidatePath("/admin/pet");
  redirect("/admin/pet");
}

export async function togglePetItemActive(id: string, isActive: boolean) {
  await requireAdmin();
  await prisma.petItem.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/pet");
}

export async function deletePetItem(id: string) {
  await requireAdmin();

  // Purchases reference the item so history stays readable; deleting one a
  // student has bought would erase what they paid for.
  const bought = await prisma.petPurchase.count({ where: { itemId: id } });
  if (bought > 0) {
    throw new Error(
      "A student has already bought this item, so it can't be deleted. Switch it off instead."
    );
  }

  await prisma.petItem.delete({ where: { id } });
  revalidatePath("/admin/pet");
}

// Kept in step with the slots declared in pet-cat.tsx.
const SLOT_BY_KEY: Record<string, string> = {
  "hat-party": "head",
  "hat-cap": "head",
  "hat-crown": "head",
  "hat-wizard": "head",
  "scarf-red": "neck",
  "scarf-stripe": "neck",
  bowtie: "neck",
  "cape-hero": "body",
  "jumper-knit": "body",
};

function slotForKey(key: string) {
  return SLOT_BY_KEY[key] ?? "head";
}
