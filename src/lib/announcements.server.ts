import { prisma } from "@/lib/prisma";

export type LiveAnnouncement = { id: string; message: string };

export type LivePopupAd = {
  id: string;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
};

// Switched on, started, and not yet expired - the same window test both the
// ticker and the pop-ups use.
function liveWindow(now: Date) {
  return {
    isActive: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  };
}

/**
 * The pop-up ads running right now, newest first so the most recent campaign
 * is the first thing a student sees after logging in.
 */
export async function getLivePopupAds(): Promise<LivePopupAd[]> {
  return prisma.popupAd.findMany({
    where: liveWindow(new Date()),
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, imageUrl: true, linkUrl: true },
  });
}

/**
 * The notices on screen right now: switched on, started, and not yet expired.
 * A null start or end means that side of the window is open.
 *
 * Ordered oldest first so the ticker reads in the order the notices were
 * written, rather than reshuffling as new ones are added.
 */
export async function getLiveAnnouncements(): Promise<LiveAnnouncement[]> {
  return prisma.announcement.findMany({
    where: liveWindow(new Date()),
    orderBy: { createdAt: "asc" },
    select: { id: true, message: true },
  });
}
