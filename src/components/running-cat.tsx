"use client";

import { PetPic } from "@/components/pet-pic";

/**
 * The marker that runs along the progress bar. Around 24px, so the face crop
 * again rather than the full body.
 */
export function RunningCat({ className }: { className?: string }) {
  return <PetPic face className={`object-contain ${className ?? ""}`} />;
}
