"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/lib/actions/auth";

export function AddForm({
  action,
  placeholder,
  buttonLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  placeholder: string;
  buttonLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.error && !pending && inputRef.current) {
      inputRef.current.value = "";
    }
  }, [state, pending]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          name="name"
          required
          placeholder={placeholder}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-black px-3 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? "Adding..." : buttonLabel}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
