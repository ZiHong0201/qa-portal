"use client";

import { useEffect, useRef, useState } from "react";
import { usePetAppearance } from "@/components/pet-appearance";
import { petFaceSrc, petSpriteSrc, type PetPose } from "@/lib/pet-art";

/**
 * The cat as artwork, for the decorative places it turns up around the portal
 * - the celebration, the progress marker, the companion button.
 *
 * Coat comes from the adopted cat when there is one, so these match what the
 * student raised, and falls back to grey for anyone without a pet.
 *
 * Renders nothing at all if the file is missing. That is deliberate for
 * decoration: an absent flourish is invisible, whereas a broken-image icon in
 * the corner of the screen is worse than no cat.
 */
export function PetPic({
  pose,
  face = false,
  className,
  alt = "",
}: {
  pose?: PetPose;
  /** Use the head-and-ears crop, for anything drawn below ~64px. */
  face?: boolean;
  className?: string;
  alt?: string;
}) {
  const appearance = usePetAppearance();
  const coat = appearance?.coat ?? "grey";
  const src = face ? petFaceSrc(coat) : petSpriteSrc(coat, pose ?? "idle");

  const [missing, setMissing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // A 404 resolves before hydration attaches onError, so the handler alone
  // never fires for a missing file - see the same note in pet-sprite.tsx.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setMissing(true);
  }, [src]);

  if (missing) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      key={src}
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={className}
      onError={() => setMissing(true)}
      draggable={false}
    />
  );
}
