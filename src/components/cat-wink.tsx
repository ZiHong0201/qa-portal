"use client";

import { PetPic } from "@/components/pet-pic";

/**
 * A small approving cat beside a correct answer. Drawn at about 28px, so it
 * uses the face crop - a whole cat that size is a grey smudge.
 */
export function CatWink({ className }: { className?: string }) {
  return <PetPic face className={`object-contain ${className ?? ""}`} />;
}
