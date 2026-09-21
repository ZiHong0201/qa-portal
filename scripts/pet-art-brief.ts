// Prints the artwork the virtual cat needs, and what is already in place.
// Imports the pose list from the app itself, so the brief cannot drift.
//   npx tsx scripts/pet-art-brief.ts
import { existsSync } from "fs";
import path from "path";
import { PET_POSES, ESSENTIAL_POSES, POSE_BRIEF } from "../src/lib/pet-art";

const COATS = ["grey", "ginger", "black", "cream"];

let have = 0;
let want = 0;

console.log("Files go in  public/pets/<coat>/<pose>.webp");
console.log(`Colours: ${COATS.join(", ")}\n`);

for (const pose of PET_POSES) {
  const required = ESSENTIAL_POSES.includes(pose);
  const present = COATS.filter((c) =>
    existsSync(path.join("public", "pets", c, `${pose}.webp`))
  );
  have += present.length;
  want += COATS.length;

  const missing = COATS.filter((c) => !present.includes(c));
  console.log(
    `${pose.padEnd(12)} ${(required ? "REQUIRED" : "optional").padEnd(9)} ` +
      `${present.length}/${COATS.length}${missing.length ? `  missing: ${missing.join(", ")}` : "  ✓"}`
  );
  console.log(`             ${POSE_BRIEF[pose]}`);
}

console.log(`\n${have} of ${want} images present.`);
console.log("Anything missing falls back to the old SVG cat, so add them a few at a time.");
