import type { LiveAnnouncement } from "@/lib/announcements.server";
import { Marquee, Megaphone } from "@/components/marquee";

/** Separator drawn between notices when more than one is live at a time. */
const SEPARATOR = "  •  ";

export function AnnouncementBar({ announcements }: { announcements: LiveAnnouncement[] }) {
  if (announcements.length === 0) return null;

  return (
    <div className="flex items-center gap-2 bg-sky-900 px-3 py-1.5 text-white">
      {/* Outside the scrolling area, so the icon stays put as the text runs. */}
      <Megaphone />
      <span className="sr-only">Announcement:</span>
      <Marquee text={announcements.map((a) => a.message).join(SEPARATOR)} />
    </div>
  );
}
