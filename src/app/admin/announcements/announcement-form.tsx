"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/lib/actions/auth";
import { ANNOUNCEMENT_MAX_LENGTH } from "@/lib/announcements";
import { WindowFields } from "./window-fields";

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

// Deliberately a copy of the real bar's markup rather than the component
// itself: that one takes rows straight from the database, and this needs to
// render whatever is in the textarea right now.
function TickerPreview({ text }: { text: string }) {
  const seconds = Math.max(14, Math.ceil(text.length / 9));
  return (
    <div className="flex items-center gap-2 bg-sky-900 px-3 py-1.5 text-white">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 shrink-0"
        aria-hidden="true"
      >
        <path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1Z" />
        <path d="M7 14v3a2 2 0 0 0 4 0v-1" />
        <path d="M17 9a4 4 0 0 1 0 6" />
        <path d="M19.5 6.5a7.5 7.5 0 0 1 0 11" />
      </svg>
      <div className="marquee-viewport min-w-0 flex-1 overflow-hidden">
        <div
          className="marquee-track flex w-max text-sm whitespace-nowrap"
          style={{ ["--marquee-duration" as string]: `${seconds}s` }}
        >
          <span className="pr-16">{text}</span>
          <span className="pr-16" aria-hidden="true">
            {text}
          </span>
        </div>
      </div>
    </div>
  );
}
