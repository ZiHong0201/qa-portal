// Generates the PWA icon set from assets/icon-source.png.
//
// The source is a 338x440 portrait whose own background is white, so it is
// cropped to a square around the head and shoulders rather than letterboxed -
// letterboxing left a white rectangle floating on a coloured square, which
// read as a photo pasted onto a tile instead of an app icon.
//
// Two flavours are produced:
// - "any" icons are the crop, edge to edge, and are what most launchers show.
// - the "maskable" icon insets that crop to ~76% on a matching background, so
//   it survives Android cropping it to a circle or squircle. The safe zone is
//   the middle 80%; anything outside it can be cut away.
//
// Re-run after replacing the source: node scripts/generate-icons.mjs
import sharp from "sharp";
import fs from "fs";
import path from "path";

const SOURCE = "assets/icon-source.png";
const OUT_DIR = "public/icons";
// Matches the source portrait's own background, so the inset icon has no seam.
const BACKGROUND = { r: 255, g: 255, b: 255, alpha: 1 };

// Crop to a square from the top of the portrait: that frames the face and
// shoulders and drops the empty space below the chest.
function squareCrop(size) {
  return sharp(SOURCE)
    .flatten({ background: BACKGROUND })
    .resize(size, size, { fit: "cover", position: "top" });
}

async function writeIcon(size, file) {
  await squareCrop(size).png().toFile(path.join(OUT_DIR, file));
  report(file, size);
}

async function writeMaskable(size, file, scale = 0.76) {
  const inner = Math.round(size * scale);
  const cropped = await squareCrop(inner).toBuffer();
  const pad = Math.round((size - inner) / 2);
  await sharp({ create: { width: size, height: size, channels: 4, background: BACKGROUND } })
    .composite([{ input: cropped, top: pad, left: pad }])
    .png()
    .toFile(path.join(OUT_DIR, file));
  report(file, size);
}

function report(file, size) {
  const { size: bytes } = fs.statSync(path.join(OUT_DIR, file));
  console.log(`${file.padEnd(28)} ${size}x${size}  ${(bytes / 1024).toFixed(1)} KB`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

await writeIcon(192, "icon-192.png");
await writeIcon(512, "icon-512.png");
await writeMaskable(512, "icon-maskable-512.png");
await writeMaskable(192, "icon-maskable-192.png");
// iOS ignores transparency and rounds the corners itself, so this is opaque
// and edge to edge.
await writeIcon(180, "apple-touch-icon.png");

console.log("\nDone.");
