"use client";

import { useRef } from "react";
import { updateStudentGrade } from "@/lib/actions/students";

export function GradeEditor({
  studentId,
  grade,
  grades,
}: {
  studentId: string;
  grade: string | null;
  grades: string[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={updateStudentGrade.bind(null, studentId)}
      className="inline-block"
    >
      <select
        key={grade ?? "unset"}
        name="grade"
        defaultValue={grade ?? ""}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
      >
        {!grade && (
          <option value="" disabled>
            Not set
          </option>
        )}
        {grades.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
    </form>
  );
}
