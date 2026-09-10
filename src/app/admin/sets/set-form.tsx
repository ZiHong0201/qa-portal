"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/lib/actions/auth";

export function SetForm({
  action,
  initial,
  grades,
  subjects,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initial?: {
    title: string;
    description: string | null;
    grades: string[];
    subject: string;
    simulationUrl: string | null;
  };
  grades: string[];
  subjects: string[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  if (grades.length === 0 || subjects.length === 0) {
    return (
      <p className="rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
        Add at least one grade and one subject in{" "}
        <Link href="/admin/master-data" className="underline">
          Master Data
        </Link>{" "}
        before creating a question set.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="title">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={initial?.title}
          placeholder="e.g. Chapter 3 Quiz"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <span className="mb-1 block text-sm font-medium">Grades</span>
          <div className="flex flex-col gap-1 rounded-md border border-gray-300 px-3 py-2">
            {grades.map((g) => (
              <label key={g} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="grades"
                  value={g}
                  defaultChecked={initial ? initial.grades.includes(g) : g === grades[0]}
                />
                {g}
              </label>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium" htmlFor="subject">
            Subject
          </label>
          <select
            id="subject"
            name="subject"
            required
            defaultValue={initial?.subject ?? subjects[0]}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="-mt-2 text-xs text-gray-500">
        Only students in one of these grades (and this subject) will see this set. Manage the
        available options in{" "}
        <Link href="/admin/master-data" className="underline">
          Master Data
        </Link>
        .
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="description">
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="simulationUrl">
          Related simulation URL (optional)
        </label>
        <input
          id="simulationUrl"
          name="simulationUrl"
          type="url"
          placeholder="https://phet.colorado.edu/sims/html/..."
          defaultValue={initial?.simulationUrl ?? ""}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          Embedded on the set page for students, e.g. a PhET interactive simulation related to
          this topic. Must be an https:// link.
        </p>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
