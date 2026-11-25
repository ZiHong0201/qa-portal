"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LOOK, type PetLook } from "@/lib/study-pet";

const PetLookContext = createContext<PetLook | null>(null);

/**
 * Carries the student's own pet down to the decorative pets around the
 * portal - the corner button, the celebrations, the tick beside a correct
 * answer - so every one of them is the pet they are raising.
 *
 * Filled from the nav's query, which already runs on every page, so this
 * costs no extra round trip.
 */
export function PetLookProvider({ value, children }: { value: PetLook | null; children: React.ReactNode }) {
  return <PetLookContext value={value}>{children}</PetLookContext>;
}

/** The student's pet, or the default pet for staff and anyone without one. */
export function usePetLook(): PetLook {
  return useContext(PetLookContext) ?? DEFAULT_LOOK;
}
