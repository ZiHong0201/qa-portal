"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { savePopupImage, deletePopupImage } from "@/lib/uploads";
import { localInputToDate, ANNOUNCEMENT_MAX_LENGTH } from "@/lib/announcements";
import type { FormState } from "./auth";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}

// The ticker and the pop-ups share a scheduling window, so they share this.
const windowSchema = z.object({
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

/**
 * Reads the two datetime-local fields as Malaysian wall-clock time and checks
 * they make a sensible window. Returned as an error string rather than a throw
 * so the form can show it inline.
 */
function parseWindow(raw: z.infer<typeof windowSchema>) {
  const startsAt = localInputToDate(raw.startsAt ?? "");
  const endsAt = localInputToDate(raw.endsAt ?? "");

  if (raw.startsAt?.trim() && !startsAt) return { error: "Start date is not a valid date." };
  if (raw.endsAt?.trim() && !endsAt) return { error: "End date is not a valid date." };
  if (startsAt && endsAt && endsAt <= startsAt) {
    return { error: "The end date must be after the start date." };
  }

  return { startsAt, endsAt, isActive: raw.isActive ?? false };
}

function readWindow(formData: FormData) {
  return windowSchema.safeParse({
    startsAt: formData.get("startsAt") ?? undefined,
    endsAt: formData.get("endsAt") ?? undefined,
    // An unchecked checkbox submits nothing at all, which coerces to false.
    isActive: formData.get("isActive") ?? false,
  });
}

/* ------------------------------ ticker ------------------------------ */

const messageSchema = z
  .string()
  .trim()
  .min(1, "Message is required")
  .max(ANNOUNCEMENT_MAX_LENGTH, `Message must be ${ANNOUNCEMENT_MAX_LENGTH} characters or fewer`);

export async function createAnnouncement(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdmin();

  const message = messageSchema.safeParse(formData.get("message"));
  if (!message.success) return { error: message.error.issues[0].message };

  const raw = readWindow(formData);
  if (!raw.success) return { error: raw.error.issues[0].message };
  const parsed = parseWindow(raw.data);
  if ("error" in parsed) return { error: parsed.error };

  await prisma.announcement.create({
    data: {
      message: message.data,
      startsAt: parsed.startsAt,
      endsAt: parsed.endsAt,
      isActive: parsed.isActive,
      createdById: session.user.id,
    },
  });

  revalidatePath("/admin/announcements");
  redirect("/admin/announcements");
}

export async function updateAnnouncement(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const message = messageSchema.safeParse(formData.get("message"));
  if (!message.success) return { error: message.error.issues[0].message };

  const raw = readWindow(formData);
  if (!raw.success) return { error: raw.error.issues[0].message };
  const parsed = parseWindow(raw.data);
  if ("error" in parsed) return { error: parsed.error };

  await prisma.announcement.update({
    where: { id },
    data: {
      message: message.data,
      startsAt: parsed.startsAt,
      endsAt: parsed.endsAt,
      isActive: parsed.isActive,
    },
  });

  revalidatePath("/admin/announcements");
  redirect("/admin/announcements");
}

export async function toggleAnnouncementActive(id: string, isActive: boolean) {
  await requireAdmin();
  await prisma.announcement.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/announcements");
}

export async function deleteAnnouncement(id: string) {
  await requireAdmin();
  await prisma.announcement.delete({ where: { id } });
  revalidatePath("/admin/announcements");
}

/* ----------------------------- pop-up ads ----------------------------- */

const popupSchema = z.object({
  title: z.string().trim().max(200).optional(),
  linkUrl: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .refine((v) => !v || /^https?:\/\//i.test(v), "Link must start with http:// or https://"),
});

async function parseImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return {};

  try {
    return { url: await savePopupImage(file) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save image." };
  }
}

export async function createPopupAd(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdmin();

  const fields = popupSchema.safeParse({
    title: formData.get("title") || undefined,
    linkUrl: formData.get("linkUrl") || undefined,
  });
  if (!fields.success) return { error: fields.error.issues[0].message };

  const raw = readWindow(formData);
  if (!raw.success) return { error: raw.error.issues[0].message };
  const parsed = parseWindow(raw.data);
  if ("error" in parsed) return { error: parsed.error };

  // The image is the whole point of a pop-up, so unlike the catalogue this one
  // is required rather than optional.
  const image = await parseImage(formData);
  if (image.error) return { error: image.error };
  if (!image.url) return { error: "Please choose an image for the pop-up." };

  await prisma.popupAd.create({
    data: {
      title: fields.data.title || null,
      linkUrl: fields.data.linkUrl || null,
      imageUrl: image.url,
      startsAt: parsed.startsAt,
      endsAt: parsed.endsAt,
      isActive: parsed.isActive,
      createdById: session.user.id,
    },
  });

  revalidatePath("/admin/announcements");
  redirect("/admin/announcements");
}

export async function updatePopupAd(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const existing = await prisma.popupAd.findUnique({ where: { id } });
  if (!existing) return { error: "Pop-up not found." };

  const fields = popupSchema.safeParse({
    title: formData.get("title") || undefined,
    linkUrl: formData.get("linkUrl") || undefined,
  });
  if (!fields.success) return { error: fields.error.issues[0].message };

  const raw = readWindow(formData);
  if (!raw.success) return { error: raw.error.issues[0].message };
  const parsed = parseWindow(raw.data);
  if ("error" in parsed) return { error: parsed.error };

  const image = await parseImage(formData);
  if (image.error) return { error: image.error };
  // Only bin the old file once the replacement is safely stored.
  if (image.url) await deletePopupImage(existing.imageUrl);

  await prisma.popupAd.update({
    where: { id },
    data: {
      title: fields.data.title || null,
      linkUrl: fields.data.linkUrl || null,
      imageUrl: image.url ?? existing.imageUrl,
      startsAt: parsed.startsAt,
      endsAt: parsed.endsAt,
      isActive: parsed.isActive,
    },
  });

  revalidatePath("/admin/announcements");
  redirect("/admin/announcements");
}

export async function togglePopupAdActive(id: string, isActive: boolean) {
  await requireAdmin();
  await prisma.popupAd.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/announcements");
}

export async function deletePopupAd(id: string) {
  await requireAdmin();

  const ad = await prisma.popupAd.findUnique({ where: { id } });
  if (!ad) return;

  await prisma.popupAd.delete({ where: { id } });
  await deletePopupImage(ad.imageUrl);
  revalidatePath("/admin/announcements");
}
