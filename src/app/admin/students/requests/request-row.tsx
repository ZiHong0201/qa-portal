"use client";

import { startTransition, useActionState } from "react";
import { approveRequest, rejectRequest } from "@/lib/actions/account-requests";
import { SubmitButton } from "@/components/submit-button";
import type { CentreOption } from "@/lib/centres";

export function RequestRow({
  request,
  grades,
  subjects,
  centres,
  allowNoCentre,
}: {
  request: { id: string; name: string; email: string; createdAt: string; centreId: string | null };
  grades: string[];
  subjects: string[];
  centres: CentreOption[];
  allowNoCentre: boolean;
}) {
  const [state, formAction, pending] = useActionState(approveRequest.bind(null, request.id), {});

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-medium">{request.email}</p>
          <p className="text-xs text-gray-500">Asked {request.createdAt}</p>
        </div>
        <form
          action={rejectRequest.bind(null, request.id)}
          onSubmit={(e) => {
            if (!confirm(`Reject the request from ${request.email}? No email is sent.`)) e.preventDefault();
          }}
        >
          <SubmitButton
            pendingText="Rejecting…"
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Reject
          </SubmitButton>
        </form>
      </div>

      {/* Sent from onSubmit rather than action={...}: React resets a form after
          its action returns, which on an error put the grade back to the first
          and unticked every subject, so trying again started from scratch. On
          success the row leaves the list anyway. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
        className="flex flex-col gap-3"
      >
        {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
        <div className="flex flex-wrap gap-3">
          <div className="min-w-48 flex-1">
            <label className="mb-1 block text-sm font-medium" htmlFor={`name-${request.id}`}>
              Name
            </label>
            <input
              id={`name-${request.id}`}
              name="name"
              required
              defaultValue={request.name}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="min-w-36">
            <label className="mb-1 block text-sm font-medium" htmlFor={`grade-${request.id}`}>
              Grade
            </label>
            <select
              id={`grade-${request.id}`}
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
          {centres.length > 0 && (
            <div className="min-w-44">
              <label className="mb-1 block text-sm font-medium" htmlFor={`centre-${request.id}`}>
                Centre
              </label>
              {/* Starts at the centre the student chose; whoever approves can
                  correct it. */}
              <select
                id={`centre-${request.id}`}
                name="centreId"
                required={!allowNoCentre}
                defaultValue={
                  request.centreId && centres.some((c) => c.id === request.centreId)
                    ? request.centreId
                    : allowNoCentre
                      ? ""
                      : centres[0].id
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                {allowNoCentre && <option value="">Unassigned</option>}
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium">Subjects</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-md border border-gray-300 px-3 py-2">
            {subjects.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="subjects" value={s} />
                {s}
              </label>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {pending ? "Approving…" : "Approve and email password"}
        </button>
      </form>
    </div>
  );
}
