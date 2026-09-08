import { put, del } from "@vercel/blob";
import crypto from "crypto";

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

async function saveImage(file: File, folder: "questions" | "catalogue"): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error("Image must be a PNG, JPEG, or WebP file.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("Image must be smaller than 5MB.");
  }

  const pathname = `${folder}/${crypto.randomUUID()}.${ext}`;
  const blob = await put(pathname, file, { access: "public" });

  return blob.url;
}

async function deleteImage(url: string | null | undefined) {
  if (!url) return;
  await del(url).catch(() => {});
}

export function saveDiagram(file: File) {
  return saveImage(file, "questions");
}

export function deleteDiagram(url: string | null | undefined) {
  return deleteImage(url);
}

export function saveCatalogueImage(file: File) {
  return saveImage(file, "catalogue");
}

export function deleteCatalogueImage(url: string | null | undefined) {
  return deleteImage(url);
}
