// Crops a head-and-ears portrait out of a full-body pose.
//
// The portal uses the cat at 24-44px in a few places - a progress marker, a
// tick beside a correct answer, the companion button. A whole chibi cat
// shrunk to 24px is an unreadable grey blob, so those slots get a face
// instead, cropped from the same artwork so it is recognisably the same cat.
//
//   node scripts/prepare-pet-face.mjs <coat> [sourcePose]
import sharp from "sharp";
import path from "path";

const [coat, sourcePose = "happy"] = process.argv.slice(2);
if (!coat) {
  console.error("usage: node scripts/prepare-pet-face.mjs <coat> [sourcePose]");
  process.exit(1);
}

const SIZE = 256;
const src = path.join("public", "pets", coat, `${sourcePose}.webp`);

// Find the cat within the padded canvas first, so the crop is measured from
// the animal rather than from the frame around it.
const trimmed = await sharp(src).trim({ threshold: 1 }).toBuffer();
const t = await sharp(trimmed).metadata();

// Head and ears occupy roughly the top half of these sitting poses. Taking a
// little more than half keeps the chin and the chest flash, which is what
// makes it read as a cat rather than a pair of eyes.
const headH = Math.round(t.height * 0.56);
const headW = Math.min(t.width, Math.round(headH * 1.15));

const face = await sharp(trimmed)
  .extract({
    left: Math.round((t.width - headW) / 2),
    top: 0,
    width: headW,
    height: headH,
  })
  .trim({ threshold: 1 })
  .toBuffer();

const f = await sharp(face).metadata();
const scale = Math.min((SIZE - 16) / f.width, (SIZE - 16) / f.height);
const w = Math.round(f.width * scale);
const h = Math.round(f.height * scale);

const out = path.join("public", "pets", coat, "face.webp");
await sharp({
  create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([
    {
      input: await sharp(face).resize(w, h).toBuffer(),
      left: Math.round((SIZE - w) / 2),
      top: Math.round((SIZE - h) / 2),
    },
  ])
  .webp({ quality: 92 })
  .toFile(out);

console.log(`${out}  (face ${w}x${h} in ${SIZE}px, from ${sourcePose})`);
