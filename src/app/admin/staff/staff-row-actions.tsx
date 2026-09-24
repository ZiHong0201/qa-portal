"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteStaff, revokeStaff } from "@/lib/actions/staff";
import type { FormState } from "@/lib/actions/auth";

/**
 * Edit / revoke / delete for one staff account.
 *
 * Delete and revoke report back rather than redirecting, because the
 * interesting outcome is a refusal - "this teacher wrote 40 questions", "this
 * is the only admin" - and that has to be readable next to the row it is
 * about.
 */
export function StaffRowActions({
  staffId,
  name,
  isSelf,
}: {
  staffId: string;
  name: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [state, run, pending] = useActionState<FormState, "delete" | "revoke">(
    async (_prev, intent) => {
      const result = intent === "delete" ? await deleteStaff(staffId) : await revokeStaff(staffId);
      if (!result.error) router.refresh();
      return result;
    },
    {}
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3 text-sm">
        <Link href={`/admin/staff/${staffId}/edit`} className="text-sky-700 hover:underline">
          Edit
        </Link>
        {/* Neither destructive action is offered on your own row: both are
            refused by the action, and an button that always fails is worse
            than no button. */}
        {!isSelf && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (
                  confirm(
                    `Revoke ${name}'s access? Their account keeps working as an ordinary ` +
                      `student account, and everything they have written or marked is kept.`
                  )
                ) {
                  run("revoke");
                }
              }}
              className="text-amber-700 hover:underline disabled:opacity-50"
            >
              Revoke access
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (
                  confirm(
                    `Delete ${name}'s account entirely? This cannot be undone. If they have ` +
                      `written or marked anything, revoke their access instead.`
                  )
                ) {
                  run("delete");
                }
              }}
              className="text-red-600 hover:underline disabled:opacity-50"
            >
              Delete
            </button>
          </>
        )}
      </div>
      {state.error && (
        <p className="max-w-sm rounded-md bg-red-50 px-2 py-1 text-right text-xs text-red-700">
          {state.error}
        </p>
      )}
    </div>
  );
}
