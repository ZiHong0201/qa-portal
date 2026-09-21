"use client";

import { PetPic } from "@/components/pet-pic";

/**
 * The cat cheering, for finishing a set and for first place on the board.
 *
 * Drawn artwork now rather than hand-built SVG. The sparkles stay as markup
 * because they animate independently of the cat and are cheaper as three
 * characters than as part of the image.
 */
export function CelebratingCat({
  className,
  // The default matches the inline banners; the completion overlay passes a
  // bigger pair so the cat is the centrepiece there.
  size = "h-16 w-16",
  sparkleSize = "text-base",
}: {
  className?: string;
  size?: string;
  sparkleSize?: string;
}) {
  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      <span
        className={`animate-sparkle absolute -top-2 -left-2 text-yellow-400 ${sparkleSize}`}
        style={{ animationDelay: "0s" }}
      >
        &#10022;
      </span>
      <span
        className={`animate-sparkle absolute top-0 -right-3 text-yellow-400 ${sparkleSize}`}
        style={{ animationDelay: "0.3s" }}
      >
        &#10022;
      </span>
      <span
        className={`animate-sparkle absolute -top-4 left-1/2 -translate-x-1/2 text-yellow-400 ${sparkleSize}`}
        style={{ animationDelay: "0.6s" }}
      >
        &#10022;
      </span>
      <PetPic pose="celebrating" className={`animate-cat-hop object-contain ${size}`} />
    </div>
  );
}
