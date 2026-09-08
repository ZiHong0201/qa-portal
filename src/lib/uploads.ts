import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
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

  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  const filename = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/${folder}/${filename}`;
}

async function deleteImage(url: string | null | undefined, folder: "questions" | "catalogue") {
  const prefix = `/uploads/${folder}/`;
  if (!url || !url.startsWith(prefix)) return;
  const filePath = path.join(process.cwd(), "public", url);
  await unlink(filePath).catch(() => {});
}

export function saveDiagram(file: File) {
  return saveImage(file, "questions");
}

export function deleteDiagram(url: string | null | undefined) {
  return deleteImage(url, "questions");
}

export function saveCatalogueImage(file: File) {
  return saveImage(file, "catalogue");
}

export function deleteCatalogueImage(url: string | null | undefined) {
  return deleteImage(url, "catalogue");
}
