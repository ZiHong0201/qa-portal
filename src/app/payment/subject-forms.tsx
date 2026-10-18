"use client";

import { useActionState, useState, useTransition } from "react";
import { addSubject, removeSubject } from "@/lib/actions/fees";
import type { Result } from "@/lib/fees.server";
import { Message, button, input } from "./form-parts";

export function AddSubjectForm() {
  // Held in state: React resets an uncontrolled field once the action returns.
  const [name, setName] = useState("");
  const [state, action, pending] = useActionState(async (prev: Result, formData: FormData) => {
    const r = await addSubject(prev, formData);
    if (!r.error) setName("");
    return r;
  }, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Additional Mathematics"
        aria-label="New subject"
        maxLength={60}
        required
        className={`${input} w-72 max-w-full`}
      />
      <button disabled={pending || !name.trim()} className={button}>
        Add subject
      </button>
      <Message state={state} />
    </form>
  );
}

export function RemoveSubjectButton({ id, name }: { id: string; name: string }) {
  const [busy, start] = useTransition();
  const [state, setState] = useState<Result>({});
  return (
    <span className="flex items-center gap-2">
      {state.error && <Message state={state} />}
      <button
        disabled={busy}
        onClick={() => {
          if (!confirm(`Remove ${name} from the subjects a receipt can be for? Receipts already made keep it.`)) return;
          start(async () => setState(await removeSubject(id)));
        }}
        className="text-sm text-red-600 hover:underline disabled:opacity-40"
      >
        {busy ? "Removing..." : "Remove"}
      </button>
    </span>
  );
}
