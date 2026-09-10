"use client";

import { deleteStudent } from "@/lib/actions/students";

export function DeleteStudentButton({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  return (
    <form
      action={deleteStudent.bind(null, studentId)}
      onSubmit={(e) => {
        if (
          !confirm(
            `Delete ${studentName}'s account? This permanently removes their login, answer history, and points. This can't be undone.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
      >
        Delete account
      </button>
    </form>
  );
}
