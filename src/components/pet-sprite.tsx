"use client";

import { useEffect, useRef, useState } from "react";
import { PetCat } from "@/components/pet-cat";
import { petSpriteSrc, poseForMood, type PetPose } from "@/lib/pet-art";
import type { Mood } from "@/lib/pet";

/**
 * The cat, as drawn artwork.
 *
 * Falls back to the old SVG cat if the image is missing, so artwork can be
 * added a pose or a colour at a time rather than all at once - and a typo in a
 * filename shows the wrong-looking cat rather than a broken image icon.
 *
 * Plain <img> rather than next/image on purpose: these are small, fixed-size,
 * already-optimised WebP files served from /public, so the optimiser would add
 * a round trip for nothing.
 */
export function PetSprite({
  coat,
  pose,
  mood,
  className,
  priority = false,
}: {
  coat: string;
  /** Overrides the pose the mood would pick - "eating" while a treat is given. */
  pose?: PetPose;
  mood?: Mood["key"];
  className?: string;
  priority?: boolean;
}) {
  const [missing, setMissing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const resolved: PetPose = pose ?? poseForMood(mood ?? "content");

  // onError alone is not enough. The image is requested during server render,
  // so a missing file 404s well before React hydrates and attaches the
  // handler - the error event has already been and gone, and the student is
  // left looking at a broken-image icon. Checking the element on mount catches
  // exactly that case: complete with no intrinsic width means it failed.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setMissing(true);
  }, [coat, resolved]);

  if (missing) {
    return <PetCat coat={coat} mood={mood} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      // Re-mounts when the file changes, so a pose that failed once does not
      // keep the fallback showing after a different pose loads fine.
      ref={imgRef}
      key={`${coat}/${resolved}`}
      src={petSpriteSrc(coat, resolved)}
      alt="Your cat"
      className={className}
      loading={priority ? "eager" : "lazy"}
      onError={() => setMissing(true)}
      draggable={false}
    />
  );
}
