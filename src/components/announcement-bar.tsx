import type { LiveAnnouncement } from "@/lib/announcements.server";

/** Separator drawn between notices when more than one is live at a time. */
const SEPARATOR = "  •  ";

function Megaphone() {
  return (
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
      {/* Horn, opening to the right towards the text it is announcing. */}
      <path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1Z" />
      {/* Handle hanging off the underside of the horn. */}
      <path d="M7 14v3a2 2 0 0 0 4 0v-1" />
      {/* Two arcs for the sound coming out. */}
      <path d="M17 9a4 4 0 0 1 0 6" />
      <path d="M19.5 6.5a7.5 7.5 0 0 1 0 11" />
    </svg>
  );
}

export function AnnouncementBar({ announcements }: { announcements: LiveAnnouncement[] }) {
  if (announcements.length === 0) return null;

  const text = announcements.map((a) => a.message).join(SEPARATOR);

  // Keep the scroll at a steady reading pace whatever the length, rather than
  // a fixed duration that races through a long notice and crawls on a short
  // one. Roughly nine characters a second, with a floor so a handful of words
  // still takes long enough to read comfortably.
  const seconds = Math.max(14, Math.ceil(text.length / 9));

  return (
    <div className="flex items-center gap-2 bg-sky-900 px-3 py-1.5 text-white">
      {/* Outside the scrolling area, so the icon stays put as the text runs. */}
      <Megaphone />
      <span className="sr-only">Announcement:</span>

      <div className="marquee-viewport min-w-0 flex-1 overflow-hidden">
        {/* Two identical copies: sliding the track left by exactly half its
            width lands the second where the first started, so the loop has no
            visible seam. The trailing padding lives INSIDE each copy rather
            than as a flex gap, which would break that halving. */}
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
