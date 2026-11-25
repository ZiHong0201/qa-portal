"use client";

import { PetArt } from "@/components/pet-art";
import { usePetLook } from "@/components/pet-look";

/**
 * The student's pet cheering, for finishing a set and for first place on the
 * board. Always happy here, whatever its mood on the pet page - this is a
 * celebration.
 */
export function CelebratingPet({
  className,
  // The default matches the inline banners; the completion overlay passes a
  // bigger pair so the pet is the centrepiece there.
  size = "h-16 w-16",
  sparkleSize = "text-base",
}: {
  className?: string;
  size?: string;
  sparkleSize?: string;
}) {
  const look = usePetLook();
  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      {[
        ["-top-2 -left-2", "0s"],
        ["top-0 -right-3", "0.3s"],
        ["-top-4 left-1/2 -translate-x-1/2", "0.6s"],
      ].map(([position, delay]) => (
        <span
          key={position}
          className={`animate-sparkle absolute text-yellow-400 ${position} ${sparkleSize}`}
          style={{ animationDelay: delay }}
        >
          &#10022;
        </span>
      ))}
      <div className="animate-pet-hop">
        <PetArt look={{ ...look, mood: "happy" }} className={size} />
      </div>
    </div>
  );
}

/**
 * The pet's face, for icon sizes: beside a correct answer, and running along
 * the progress bar. Happy, because both only appear when something went well.
 */
export function PetFace({ className }: { className?: string }) {
  const look = usePetLook();
  return <PetArt look={{ ...look, mood: look.stage === "egg" ? look.mood : "happy" }} face className={className} />;
}
