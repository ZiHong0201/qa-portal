"use client";

import { useFormStatus } from "react-dom";
import type { ComponentPropsWithoutRef } from "react";

// A drop-in <button type="submit"> for plain server-action forms (ones not
// already wired through useActionState) that shows immediate feedback on
// click - disabled + a pending label - instead of leaving the button looking
// unresponsive until the request completes.
export function SubmitButton({
  children,
  pendingText,
  className = "",
  ...props
}: Omit<ComponentPropsWithoutRef<"button">, "type" | "disabled"> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      {...props}
      type="submit"
      disabled={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-50`}
    >
      {pending ? (pendingText ?? "Working…") : children}
    </button>
  );
}

// For forms that save themselves as soon as a field changes (a select or
// checkboxes calling requestSubmit), so there is no button to show progress
// on. Holds the fields still while the save runs, so a second change cannot
// race the first, and says it is saving. Takes the layout classes the form
// itself would have had.
export function AutoSaveFields({
  children,
  className = "",
  pendingText = "Saving…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <fieldset disabled={pending} aria-busy={pending} className={`${className} disabled:cursor-wait`}>
      {children}
      {pending && <span className="text-xs text-gray-400">{pendingText}</span>}
    </fieldset>
  );
}
