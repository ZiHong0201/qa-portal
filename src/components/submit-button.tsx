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
