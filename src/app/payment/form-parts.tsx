"use client";

import { quote } from "@/lib/fee-plans";
import { rm } from "@/lib/fees";
import type { Result } from "@/lib/fees.server";

export const input = "rounded-md border border-gray-300 px-2.5 py-1.5 text-sm";
export const button =
  "rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40";

export function Message({ state }: { state: Result }) {
  if (state.error) return <p className="text-sm text-red-700">{state.error}</p>;
  if (state.success) return <p className="text-sm text-teal-700">{state.success}</p>;
  return null;
}

/** Ticks held in state: React resets an uncontrolled form once its action returns. */
export function SubjectTicks({
  subjects,
  chosen,
  onChange,
}: {
  subjects: string[];
  chosen: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {subjects.map((s) => (
        <label
          key={s}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm has-checked:border-teal-500 has-checked:bg-teal-50"
        >
          <input
            type="checkbox"
            name="subjects"
            value={s}
            checked={chosen.includes(s)}
            onChange={(e) => onChange(e.target.checked ? [...chosen, s] : chosen.filter((x) => x !== s))}
          />
          {s}
        </label>
      ))}
    </div>
  );
}

export function GradeSelect({
  grades,
  value,
  onChange,
}: {
  grades: string[];
  value: string;
  onChange: (g: string) => void;
}) {
  return (
    <select name="grade" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Grade" className={input}>
      <option value="">Choose grade</option>
      {grades.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
    </select>
  );
}

/** The monthly price for the ticks so far - a guide while choosing. */
export function MonthlyHint({ grade, count }: { grade: string; count: number }) {
  if (!grade || count === 0) return null;
  const q = quote(grade, count, 1);
  return (
    <p className={`text-xs ${"error" in q ? "text-red-700" : "text-gray-500"}`}>
      {"error" in q ? q.error : `${count} subject${count === 1 ? "" : "s"}: ${rm(q.monthlySen)} a month`}
    </p>
  );
}
