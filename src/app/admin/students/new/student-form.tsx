"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/lib/actions/auth";

export function StudentForm({
  action,
  initial,
  grades,
  subjects,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initial?: { name: string; email: string; grade: string | null; subjects: string[] };
  grades: string[];
  subjects: string[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const isEdit = !!initial;

  if (grades.length === 0 || subjects.length === 0) {
    return (
      <p className="rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
        Add at least one grade and one subject in{" "}
        <Link href="/admin/master-data" className="underline">
          Master Data
        </Link>{" "}
        before {isEdit ? "editing this" : "creating a"} student account.
      </p>
    );
  }

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
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium" htmlFor="grade">
            Grade
          </label>
          <select
            id="grade"
            name="grade"
            required
            defaultValue={initial?.grade ?? grades[0]}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <span className="mb-1 block text-sm font-medium">Subjects</span>
          <div className="flex flex-col gap-1 rounded-md border border-gray-300 px-3 py-2">
            {subjects.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="subjects"
                  value={s}
                  defaultChecked={initial?.subjects.includes(s)}
                />
                {s}
              </label>
            ))}
          </div>
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? (isEdit ? "Saving..." : "Creating...") : submitLabel}
      </button>
    </form>
  );
}
