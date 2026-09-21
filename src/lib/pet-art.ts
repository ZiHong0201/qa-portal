import type { Mood } from "@/lib/pet";

/**
 * Sprite artwork for the virtual cat.
 *
 * The cat is drawn art rather than code now. Hand-written SVG hit its ceiling:
 * separate stacked shapes with one uniform stroke and no shading read as
 * assembled rather than drawn, and no amount of extra path data fixes that -
 * it needs an artist looking at the curve while they pull it.
 *
 * The SVG cat is kept as a fallback, so a pose or colour with no image yet
 * still renders something instead of a gap. That means art can arrive a few
 * files at a time rather than all at once.
 */

export const PET_POSES = [
  "idle",
  "happy",
  "hungry",
  "sad",
  "eating",
  "petted",
  "sleeping",
  "celebrating",
  "walking",
  "studying",
  "playing",
] as const;

export type PetPose = (typeof PET_POSES)[number];

/** What each pose is for, so the art brief and the code cannot drift apart. */
export const POSE_BRIEF: Record<PetPose, string> = {
  idle: "Sitting, calm and neutral. Seen far more than any other, so it is the one to get right.",
  happy: "Delighted - bright eyes, maybe a raised paw.",
  hungry: "Looking up hopefully, asking to be fed.",
  sad: "Ears down, subdued. Never distressed - a student should feel like feeding it, not guilty.",
  eating: "Head down at a bowl, mid-mouthful.",
  petted: "Eyes closed, blissful, being fussed over.",
  sleeping: "Curled up asleep.",
  celebrating: "Paws up, thrilled - shown when a set is finished.",
  walking: "Mid-stride, side on.",
  studying: "Sitting with an open book.",
  playing: "Pouncing or mid-leap.",
};

/** Which poses the portal actually reaches today. The rest are decoration. */
export const ESSENTIAL_POSES: PetPose[] = [
  "idle",
  "happy",
  "hungry",
  "sad",
  "eating",
  "petted",
  "celebrating",
];

/** Where a sprite lives. Files are served straight from /public. */
export function petSpriteSrc(coat: string, pose: PetPose) {
  return `/pets/${coat}/${pose}.webp`;
}

/** The pose that matches a mood, for the ordinary resting state. */
export function poseForMood(mood: Mood["key"]): PetPose {
  switch (mood) {
    case "happy":
      return "happy";
    case "hungry":
      return "hungry";
    case "sad":
      return "sad";
    default:
      return "idle";
  }
}

/**
 * Clothing is switched off while the artwork is changing over. Hats and
 * scarves were drawn against the old SVG grid and would sit beside a sprite
 * cat's head rather than on it.
 *
 * Nothing is deleted: PetOwnedItem rows stay exactly as they are, so anything
 * already bought comes straight back when per-pose garment art exists and this
 * flips to true.
 */
export const CLOTHING_ENABLED = false;
