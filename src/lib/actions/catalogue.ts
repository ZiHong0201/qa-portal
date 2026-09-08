"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveCatalogueImage, deleteCatalogueImage } from "@/lib/uploads";
import { getStudentBalance } from "@/lib/points";
import type { FormState } from "./auth";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}

const itemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(2000).optional(),
  cost: z.coerce.number().int().min(1, "Cost must be at least 1 point").max(1_000_000),
});

async function parseImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return {};

  try {
    const url = await saveCatalogueImage(file);
    return { url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save image." };
  }
}

export async function createCatalogueItem(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdmin();

  const parsed = itemSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    cost: formData.get("cost"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const image = await parseImage(formData);
  if (image.error) return { error: image.error };

  await prisma.catalogueItem.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      cost: parsed.data.cost,
      imageUrl: image.url,
      createdById: session.user.id,
    },
  });

  revalidatePath("/admin/catalogue");
  redirect("/admin/catalogue");
}

export async function updateCatalogueItem(
  itemId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const existing = await prisma.catalogueItem.findUnique({ where: { id: itemId } });
  if (!existing) return { error: "Item not found." };

  const parsed = itemSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    cost: formData.get("cost"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const image = await parseImage(formData);
  if (image.error) return { error: image.error };
  if (image.url) await deleteCatalogueImage(existing.imageUrl);

  await prisma.catalogueItem.update({
    where: { id: itemId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      cost: parsed.data.cost,
      imageUrl: image.url ?? existing.imageUrl,
    },
  });

  revalidatePath("/admin/catalogue");
  redirect("/admin/catalogue");
}

export async function toggleCatalogueItemActive(itemId: string, isActive: boolean) {
  await requireAdmin();
  await prisma.catalogueItem.update({ where: { id: itemId }, data: { isActive } });
  revalidatePath("/admin/catalogue");
}

export async function deleteCatalogueItem(itemId: string) {
  await requireAdmin();

  const item = await prisma.catalogueItem.findUnique({ where: { id: itemId } });
  if (!item) return;

  const count = await prisma.redemption.count({ where: { catalogueItemId: itemId } });
  if (count > 0) {
    throw new Error(
      "This item has already been redeemed by a student and can't be deleted. Deactivate it instead."
    );
  }

  await prisma.catalogueItem.delete({ where: { id: itemId } });
  await deleteCatalogueImage(item.imageUrl);
  revalidatePath("/admin/catalogue");
}

export type RedeemState = { error?: string; success?: string };

// prevState/formData are unused but required to match the useActionState action signature.
/* eslint-disable @typescript-eslint/no-unused-vars */
export async function redeemCatalogueItem(
  itemId: string,
  _prevState: RedeemState,
  _formData: FormData
): Promise<RedeemState> {
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") {
    return { error: "You must be logged in as a student." };
  }

  const item = await prisma.catalogueItem.findUnique({ where: { id: itemId } });
  if (!item || !item.isActive) {
    return { error: "This item is no longer available." };
  }

  const { balance } = await getStudentBalance(session.user.id);
  if (balance < item.cost) {
    return { error: "You don't have enough points for this item." };
  }

  await prisma.redemption.create({
    data: {
      studentId: session.user.id,
      catalogueItemId: item.id,
      cost: item.cost,
    },
  });

  revalidatePath("/dashboard/catalogue");
  return { success: `Redeemed "${item.name}" for ${item.cost} points.` };
}
