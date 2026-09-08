"use client";

import { useRef } from "react";
import { updateStudentSubject } from "@/lib/actions/students";

export function SubjectEditor({
  studentId,
  subject,
  subjects,
}: {
  studentId: string;
  subject: string | null;
  subjects: string[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={updateStudentSubject.bind(null, studentId)}
      className="inline-block"
    >
      <select
        key={subject ?? "unset"}
        name="subject"
        defaultValue={subject ?? ""}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
      >
        {!subject && (
          <option value="" disabled>
            Not set
          </option>
        )}
        {subjects.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </form>
  );
}
