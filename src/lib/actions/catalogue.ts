"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SUSPENDED_ERROR, isSuspended } from "@/lib/suspension";
import { saveCatalogueImage, deleteCatalogueImage } from "@/lib/uploads";
import { exchangeGift } from "@/lib/gift-exchange.server";
import type { FormState } from "./auth";



const itemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(2000).optional(),
  cost: z.coerce.number().int().min(1, "Cost must be at least 1 point").max(1_000_000),
  grantsPet: z.coerce.boolean().optional(),
  // Blank means "not counted" / "no limit", so both are optional numbers.
  stock: z.coerce.number().int().min(0, "Stock cannot be negative").max(100_000).optional(),
  limitPerStudent: z.coerce
    .number()
    .int()
    .min(1, "A limit must be at least 1 - leave it blank for no limit")
    .max(1000)
    .optional(),
});

/** Reads the item form. Blank number fields arrive as "" and mean "none". */
function readItemForm(formData: FormData) {
  const optionalNumber = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" && v.trim() !== "" ? v : undefined;
  };
  return itemSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    cost: formData.get("cost"),
    // An unticked checkbox submits nothing at all, which coerces to false.
    grantsPet: formData.get("grantsPet") ?? false,
    stock: optionalNumber("stock"),
    limitPerStudent: optionalNumber("limitPerStudent"),
  });
}

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

  const parsed = readItemForm(formData);
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
      grantsPet: parsed.data.grantsPet ?? false,
      stock: parsed.data.stock ?? null,
      limitPerStudent: parsed.data.limitPerStudent ?? null,
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

  const parsed = readItemForm(formData);
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
      grantsPet: parsed.data.grantsPet ?? false,
      // The form shows the current count, so saving it unchanged is a no-op
      // and editing it is a stock-take correction. Topping up during the day
      // is the list's "Add stock", which adds rather than overwrites.
      stock: parsed.data.stock ?? null,
      limitPerStudent: parsed.data.limitPerStudent ?? null,
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
  if (await isSuspended(session.user.id)) return { error: SUSPENDED_ERROR };

  const result = await exchangeGift(session.user.id, itemId);
  if (result.success) {
    revalidatePath("/dashboard/catalogue");
    revalidatePath("/admin/catalogue");
    // The nav gains a "My Cat" link the moment the cat unlocks, so the
    // layout has to be rebuilt too, not just this page.
    if (result.unlockedPet) revalidatePath("/dashboard", "layout");
  }
  return { error: result.error, success: result.success };
}

/* --------------------------- stock & delivery --------------------------- */

/**
 * Adds stock to a gift - a delivery from the supplier, say. Adds to whatever
 * is there rather than setting a number, so an exchange made while the admin
 * was typing is not quietly undone. A gift not yet counted starts counting
 * from the amount added.
 */
export async function addStock(itemId: string, formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  const amount = z.coerce.number().int().min(1).max(100_000).safeParse(formData.get("amount"));
  if (!amount.success) return { error: "Enter how many to add." };

  const item = await prisma.catalogueItem.findUnique({ where: { id: itemId }, select: { stock: true } });
  if (!item) return { error: "Gift not found." };

  await prisma.catalogueItem.update({
    where: { id: itemId },
    data: item.stock === null ? { stock: amount.data } : { stock: { increment: amount.data } },
  });
  revalidatePath("/admin/catalogue");
  revalidatePath("/dashboard/catalogue");
  return {};
}

/** Marks exchanged gifts as handed over. Takes several, for a delivery run. */
export async function markGiftsDelivered(redemptionIds: string[]): Promise<void> {
  const session = await requireAdmin();
  if (redemptionIds.length === 0) return;
  await prisma.redemption.updateMany({
    // Only ones still pending, so marking twice never moves the date.
    where: { id: { in: redemptionIds }, deliveredAt: null },
    data: { deliveredAt: new Date(), deliveredById: session.user.id },
  });
  revalidatePath("/admin/catalogue");
  revalidatePath("/dashboard/catalogue");
}

/** Puts a gift back on the to-prepare list - for one marked by mistake. */
export async function undoGiftDelivered(redemptionId: string): Promise<void> {
  await requireAdmin();
  await prisma.redemption.update({
    where: { id: redemptionId },
    data: { deliveredAt: null, deliveredById: null },
  });
  revalidatePath("/admin/catalogue");
  revalidatePath("/dashboard/catalogue");
}
