"use client";

import { useRef } from "react";
import { updateStudentCentre } from "@/lib/actions/students";
import { AutoSaveFields } from "@/components/submit-button";
import type { CentreOption } from "@/lib/centres";

/**
 * The centre a student attends, saved as soon as it is changed. `allowNone`
 * is for admins, who may take a student out of every centre; a teacher only
 * moves students between their own.
 */
export function CentreEditor({
  studentId,
  centreId,
  centres,
  allowNone,
}: {
  studentId: string;
  centreId: string | null;
  centres: CentreOption[];
  allowNone: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateStudentCentre.bind(null, studentId)} className="inline-block">
      <AutoSaveFields className="flex items-center gap-2">
        <select
          key={centreId ?? "none"}
          name="centreId"
          defaultValue={centreId ?? ""}
          onChange={() => formRef.current?.requestSubmit()}
          className={`rounded-md border px-2 py-1 text-sm ${
            centreId ? "border-gray-300" : "border-amber-300 bg-amber-50 text-amber-800"
          }`}
        >
          {(allowNone || !centreId) && (
            <option value="" disabled={!allowNone}>
              Unassigned
            </option>
          )}
          {centres.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </AutoSaveFields>
    </form>
  );
}
