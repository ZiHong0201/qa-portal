"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions/auth";

/**
 * The role picker is spelled out rather than being a dropdown, because it is
 * the one field on this form with consequences the reader may not know. An
 * admin can create more admins, reset the portal and wipe every mark in it;
 * that belongs next to the choice, not in a help page.
 */
const ROLE_OPTIONS = [
  {
    value: "TEACHER",
    label: "Teacher",
    blurb:
      "Writes and marks question sets, manages students and their points, sees integrity signals.",
  },
  {
    value: "ADMIN",
    label: "Admin",
    blurb:
      "Everything a teacher can do, plus the catalogue, announcements, the virtual cat, master data, staff accounts, and resetting the portal.",
  },
] as const;

export function StaffForm({
  action,
  initial,
  submitLabel,
  roleLocked,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initial?: { name: string; email: string; role: string };
  submitLabel: string;
  /** Set when the role must not change - the last admin, or yourself. */
  roleLocked?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const isEdit = !!initial;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initial?.name}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={initial?.email}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-500">This is what they log in with.</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="password">
          {isEdit ? "New password (leave blank to keep current)" : "Password"}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required={!isEdit}
          minLength={8}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          At least 8 characters. Give it to them yourself and ask them to change it.
        </p>
      </div>

      <fieldset>
        <legend className="mb-1 block text-sm font-medium">Role</legend>
        <div className="flex flex-col gap-2">
          {ROLE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex gap-2 rounded-md border border-gray-300 px-3 py-2 has-checked:border-sky-400 has-checked:bg-sky-50"
            >
              <input
                type="radio"
                name="role"
                value={opt.value}
                required
                disabled={!!roleLocked}
                defaultChecked={(initial?.role ?? "TEACHER") === opt.value}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium">{opt.label}</span>
                <span className="block text-xs text-gray-600">{opt.blurb}</span>
              </span>
            </label>
          ))}
        </div>
        {roleLocked && (
          <>
            {/* Disabled inputs submit nothing, so the current role is carried
                by a hidden field - otherwise saving a name change here would
                fail validation on a missing role. */}
            <input type="hidden" name="role" value={initial?.role ?? "TEACHER"} />
            <p className="mt-1 text-xs text-amber-700">{roleLocked}</p>
          </>
        )}
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 disabled:opacity-50"
      >
        {pending ? (isEdit ? "Saving..." : "Creating...") : submitLabel}
      </button>
    </form>
  );
}
