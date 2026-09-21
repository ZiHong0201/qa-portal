"use client";

import { LOCAL_TIME_ZONE } from "@/lib/announcements";

/**
 * The scheduling window and on/off switch, shared by the ticker and pop-up
 * forms so the two can never drift apart.
 *
 * Both dates are optional: an empty start means "live already", an empty end
 * means "until switched off".
 */
export function WindowFields({
  initial,
}: {
  initial?: { startsAt: string; endsAt: string; isActive: boolean };
}) {
  return (
    <fieldset className="rounded-md border border-gray-200 p-4">
      <legend className="px-1 text-sm font-medium">Display period</legend>

      <div className="flex flex-wrap gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="startsAt">
            Show from
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={initial?.startsAt ?? ""}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">Leave empty to start straight away.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="endsAt">
            Show until
          </label>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            defaultValue={initial?.endsAt ?? ""}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">Leave empty to run until switched off.</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Times are {LOCAL_TIME_ZONE.replace("_", " ")} ({LOCAL_TIME_ZONE === "Asia/Kuala_Lumpur"
          ? "UTC+8"
          : "local"}
        ).
      </p>

      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          value="true"
          defaultChecked={initial?.isActive ?? true}
          className="h-4 w-4"
        />
        Switched on
      </label>
      <p className="mt-1 text-xs text-gray-500">
        Untick to write it now and turn it on later. It only shows when this is ticked <em>and</em>{" "}
        the date is within the period above.
      </p>
    </fieldset>
  );
}
