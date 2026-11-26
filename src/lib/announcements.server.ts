import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS } from "@/lib/cache-tags";

export type LiveAnnouncement = { id: string; message: string };

/**
 * Whose notices to show: one centre's students (null: a student with no
 * centre yet, who sees only what goes to every centre), or "all" for staff,
 * who see everything that is running anywhere.
 */
export type NoticeViewer = { centreId: string | null } | "all";

// A notice with no centre rows goes to every centre.
function shownTo(viewer: NoticeViewer, centreIds: string[]) {
  if (viewer === "all" || centreIds.length === 0) return true;
  return viewer.centreId !== null && centreIds.includes(viewer.centreId);
}

export type LivePopupAd = {
  id: string;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
};

// A start or end time as milliseconds, so it survives the data cache, which
// stores results as JSON and would hand a Date back as a string.
type Window = { startsAt: number | null; endsAt: number | null };

const toMs = (d: Date | null) => (d ? d.getTime() : null);

// Started and not yet expired. A null start or end means that side of the
// window is open. Checked on every request rather than in the query, so a
// cached list still switches a notice on or off at the minute it was set to.
function isLive(row: Window, now: number) {
  return (row.startsAt === null || row.startsAt <= now) && (row.endsAt === null || row.endsAt >= now);
}

// Every switched-on notice and pop-up, whatever its window, kept in the data
// cache because both layouts read them on every page. Admins change them a
// few times a week, and the announcement actions drop the cached copy when
// they do; the hour is only a backstop.
const getSwitchedOn = unstable_cache(
  async () => {
    const [announcements, popupAds] = await Promise.all([
      prisma.announcement.findMany({
        where: { isActive: true },
        // Oldest first so the ticker reads in the order the notices were
        // written, rather than reshuffling as new ones are added.
        orderBy: { createdAt: "asc" },
        select: { id: true, message: true, startsAt: true, endsAt: true, centres: { select: { centreId: true } } },
      }),
      prisma.popupAd.findMany({
        where: { isActive: true },
        // Newest first so the most recent campaign is the first thing a
        // student sees after logging in.
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          imageUrl: true,
          linkUrl: true,
          startsAt: true,
          endsAt: true,
          centres: { select: { centreId: true } },
        },
      }),
    ]);
    return {
      announcements: announcements.map(({ centres, ...a }) => ({
        ...a,
        centreIds: centres.map((c) => c.centreId),
        startsAt: toMs(a.startsAt),
        endsAt: toMs(a.endsAt),
      })),
      popupAds: popupAds.map(({ centres, ...p }) => ({
        ...p,
        centreIds: centres.map((c) => c.centreId),
        startsAt: toMs(p.startsAt),
        endsAt: toMs(p.endsAt),
      })),
    };
  },
  ["switched-on-announcements"],
  { tags: [CACHE_TAGS.announcements], revalidate: 3600 }
);

/** The pop-up ads running right now for `viewer`, newest first. */
export async function getLivePopupAds(viewer: NoticeViewer): Promise<LivePopupAd[]> {
  const now = Date.now();
  const { popupAds } = await getSwitchedOn();
  return popupAds
    .filter((p) => isLive(p, now) && shownTo(viewer, p.centreIds))
    .map(({ id, title, imageUrl, linkUrl }) => ({ id, title, imageUrl, linkUrl }));
}

/** The notices on screen right now for `viewer`, oldest first. */
export async function getLiveAnnouncements(viewer: NoticeViewer): Promise<LiveAnnouncement[]> {
  const now = Date.now();
  const { announcements } = await getSwitchedOn();
  return announcements
    .filter((a) => isLive(a, now) && shownTo(viewer, a.centreIds))
    .map(({ id, message }) => ({ id, message }));
}
