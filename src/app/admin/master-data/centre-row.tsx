"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/lib/actions/auth";
import { renameCentre } from "@/lib/actions/masterData";

/** A centre's name, which the admin can correct in place. */
export function CentreName({ id, name }: { id: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const result = await renameCentre(id, prev, formData);
      if (!result.error) setEditing(false);
      return result;
    },
    {}
  );

  if (!editing) {
    return (
      <span className="flex items-center gap-2">
        <span>{name}</span>
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-blue-600 hover:underline">
          Rename
        </button>
      </span>
    );
  }

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-1 pr-3">
      <div className="flex gap-2">
        <input
          name="name"
          required
          defaultValue={name}
          autoFocus
          className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-sky-600 px-2 py-1 text-xs text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:underline">
          Cancel
        </button>
      </div>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
    </form>
  );
}
