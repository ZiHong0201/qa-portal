"use client";

import { deleteStudent } from "@/lib/actions/students";
import { SubmitButton } from "@/components/submit-button";

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
      <SubmitButton
        pendingText="Deleting…"
        className="rounded-md border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
      >
        Delete account
      </SubmitButton>
    </form>
  );
}
