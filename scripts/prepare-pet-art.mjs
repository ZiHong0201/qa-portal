// Turns a generated cat picture into a portal-ready sprite.
//
// Image generators show a checkerboard to *represent* transparency, and
// exporters often bake that checkerboard into the pixels - the file looks
// transparent in a preview and is actually opaque. These files were: 3
// channels, no alpha, alternating #EEEEEE and #FFFFFF across the background.
//
// So the background is removed here by flood-filling inwards from the edges,
// rather than by keying on colour. Colour-keying white would also punch holes
// through the cat's own white chest, muzzle and paws; a flood fill only takes
// what is connected to the outside and stops at the black outline.
//
//   node scripts/prepare-pet-art.mjs <input> <coat> <pose>
import sharp from "sharp";
import { mkdirSync } from "fs";
import path from "path";

const [input, coat, pose] = process.argv.slice(2);
if (!input || !coat || !pose) {
  console.error("usage: node scripts/prepare-pet-art.mjs <input> <coat> <pose>");
  process.exit(1);
}

const CANVAS = 512; // square, so every pose shares one frame
const BOTTOM_MARGIN = 28; // feet sit here in every pose, so the cat never hops

// The flood spreads through anything LIGHT and is stopped by the cat's thick
// black outline. Matching exact background tones instead was too brittle:
// these files mix a baked checkerboard, flat white, and pastel sparkles, and
// the fill stalled at the first tone it did not recognise, leaving whole
// rectangles of opaque white behind.
//
// Relying on the outline works because the cat's own light areas - chest,
// muzzle, paws - sit inside that outline, so the fill never reaches them.
const OUTLINE_MAX = 130;

function isFloodable(r, g, b) {
  return Math.max(r, g, b) > OUTLINE_MAX;
}

// Read as plain RGB. Note there is deliberately no ensureAlpha() here: the
// computed alpha is joined on as the fourth channel below, and adding an
// opaque one first would make five channels and silently discard the mask.
const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

const alpha = Buffer.alloc(width * height, 255);
const seen = new Uint8Array(width * height);
const stack = [];

// Seed from every edge pixel.
for (let x = 0; x < width; x++) {
  stack.push([x, 0], [x, height - 1]);
}
for (let y = 0; y < height; y++) {
  stack.push([0, y], [width - 1, y]);
}

let cleared = 0;
while (stack.length) {
  const [x, y] = stack.pop();
  if (x < 0 || y < 0 || x >= width || y >= height) continue;
  const idx = y * width + x;
  if (seen[idx]) continue;
  seen[idx] = 1;

  const i = idx * channels;
  if (!isFloodable(data[i], data[i + 1], data[i + 2])) continue;

  alpha[idx] = 0;
  cleared++;
  stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}

// Re-attach the computed alpha, then trim whatever is now transparent so the
// cat is measured by its own bounds rather than the generator's framing.
const withAlpha = await sharp(data, { raw: { width, height, channels } })
  .joinChannel(alpha, { raw: { width, height, channels: 1 } })
  .png()
  .toBuffer();

const trimmed = await sharp(withAlpha).trim({ threshold: 1 }).toBuffer();
const t = await sharp(trimmed).metadata();

// Normalise to a target height rather than merely fitting. Every pose must
// end up the same apparent size, because the portal renders them all into one
// fixed 176px box: a cat cropped small from a sticker sheet would otherwise
// appear half the size of one cropped large, and swap between the two as the
// mood changed. Upscaling is allowed for exactly that reason - source cells
// off a sheet are small, and the result is only ever shown at 176px anyway.
const TARGET_H = Math.round(CANVAS * 0.78);
const maxW = CANVAS - 48;
const scale = Math.min(TARGET_H / t.height, maxW / t.width);
const w = Math.round(t.width * scale);
const h = Math.round(t.height * scale);

const resized = await sharp(trimmed).resize(w, h).toBuffer();

const outDir = path.join("public", "pets", coat);
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${pose}.webp`);

await sharp({
  create: {
    width: CANVAS,
    height: CANVAS,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([
    {
      input: resized,
      left: Math.round((CANVAS - w) / 2),
      // Bottom-aligned, not centred: aligning feet is what stops the cat
      // jumping when its mood changes and a different pose loads.
      top: CANVAS - BOTTOM_MARGIN - h,
    },
  ])
  .webp({ quality: 92 })
  .toFile(outFile);

const pct = ((cleared / (width * height)) * 100).toFixed(1);
console.log(`${outFile}  (background removed: ${pct}% of pixels, cat ${w}x${h} in ${CANVAS}px)`);
