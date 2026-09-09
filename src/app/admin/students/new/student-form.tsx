"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createStudent } from "@/lib/actions/students";

export function StudentForm({
  grades,
  subjects,
}: {
  grades: string[];
  subjects: string[];
}) {
  const [state, formAction, pending] = useActionState(createStudent, {});

  if (grades.length === 0 || subjects.length === 0) {
    return (
      <p className="rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
        Add at least one grade and one subject in{" "}
        <Link href="/admin/master-data" className="underline">
          Master Data
        </Link>{" "}
        before creating a student account.
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
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
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
            defaultValue={grades[0]}
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
                <input type="checkbox" name="subjects" value={s} />
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
        {pending ? "Creating..." : "Create student account"}
      </button>
    </form>
  );
}
