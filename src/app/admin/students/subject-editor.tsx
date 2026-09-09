"use client";

import { useRef } from "react";
import { updateStudentSubjects } from "@/lib/actions/students";

export function SubjectEditor({
  studentId,
  studentSubjects,
  subjects,
}: {
  studentId: string;
  studentSubjects: string[];
  subjects: string[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={updateStudentSubjects.bind(null, studentId)}
      className="flex flex-wrap items-center gap-x-2 gap-y-1"
    >
      {subjects.length === 0 && <span className="text-sm text-gray-400">No subjects yet</span>}
      {subjects.map((s) => (
        <label key={s} className="flex items-center gap-1 text-sm whitespace-nowrap">
          <input
            type="checkbox"
            name="subjects"
            value={s}
            defaultChecked={studentSubjects.includes(s)}
            onChange={() => formRef.current?.requestSubmit()}
          />
          {s}
        </label>
      ))}
    </form>
  );
}
