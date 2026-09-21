"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/lib/actions/auth";
import { ANNOUNCEMENT_MAX_LENGTH } from "@/lib/announcements";
import { WindowFields } from "./window-fields";
import { Marquee, Megaphone } from "@/components/marquee";

type Initial = {
  message: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export function AnnouncementForm({
  action,
  initial,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initial?: Initial;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [message, setMessage] = useState(initial?.message ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={2}
          required
          maxLength={ANNOUNCEMENT_MAX_LENGTH}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Trial SPM starts on 6 October - check your timetable."
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          {message.length}/{ANNOUNCEMENT_MAX_LENGTH} characters. It scrolls right to left, so keep
          it to one sentence.
        </p>
      </div>

      {/* A live preview of the real bar, so the length and pace can be judged
          before it goes out to every student. */}
      {message.trim() && (
        <div>
          <p className="mb-1 text-sm font-medium">Preview</p>
          <div className="overflow-hidden rounded-md border border-gray-200">
            <TickerPreview text={message.trim()} />
          </div>
        </div>
      )}

      <WindowFields initial={initial} />

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 disabled:opacity-50"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

// The real bar's own components, so the preview cannot drift from what
// students actually see - only the source of the text differs.
function TickerPreview({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 bg-sky-900 px-3 py-1.5 text-white">
      <Megaphone />
      <Marquee text={text} />
    </div>
  );
}
