"use client";

import { createContext, useContext } from "react";

/** The adopted cat's look, or null when the student has not adopted one. */
export type PetAppearance = { coat: string; equipped: string[] } | null;

const PetAppearanceContext = createContext<PetAppearance>(null);

/**
 * Carries the student's own cat down to the decorative cats dotted around the
 * portal, so the companion and the celebration cat match the one they raised.
 *
 * Deliberately not applied to Mr Tan's portrait or the signed-out pages: those
 * are the portal's identity rather than the student's, and they are also seen
 * by people who have no cat at all.
 */
export function PetAppearanceProvider({
  value,
  children,
}: {
  value: PetAppearance;
  children: React.ReactNode;
}) {
  return <PetAppearanceContext value={value}>{children}</PetAppearanceContext>;
}

export function usePetAppearance() {
  return useContext(PetAppearanceContext);
}
