import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SubmitButton } from "@/components/submit-button";
import { formatWindow, isLive } from "@/lib/announcements";
import {
  deleteAnnouncement,
  toggleAnnouncementActive,
  deletePopupAd,
  togglePopupAdActive,
} from "@/lib/actions/announcements";

/** Live / Scheduled / Ended / Off, so the list says what each row is doing. */
function StatusBadge({
  item,
}: {
  item: { isActive: boolean; startsAt: Date | null; endsAt: Date | null };
}) {
  const now = new Date();

  let label: string;
  let className: string;

  if (!item.isActive) {
    label = "Off";
    className = "bg-gray-100 text-gray-500";
  } else if (isLive(item, now)) {
    label = "Live";
    className = "bg-green-100 text-green-700";
  } else if (item.startsAt && item.startsAt > now) {
    label = "Scheduled";
    className = "bg-sky-100 text-sky-700";
  } else {
    label = "Ended";
    className = "bg-amber-100 text-amber-700";
  }

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${className}`}>{label}</span>
  );
}

export default async function AdminAnnouncementsPage() {
  const [announcements, popups] = await Promise.all([
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.popupAd.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <div className="mb-2 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Announcements</h1>
          <Link
            href="/admin/announcements/new"
            className="shrink-0 rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
          >
            + New announcement
          </Link>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          Scrolls right to left across the top of every page. Any that are live at once share the
          same bar.
        </p>

        <ul className="flex flex-col gap-3">
          {announcements.map((item) => (
            <li key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium break-words">{item.message}</p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {formatWindow(item.startsAt, item.endsAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-sm">
                  <StatusBadge item={item} />
                  <Link
                    href={`/admin/announcements/${item.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                  <form action={toggleAnnouncementActive.bind(null, item.id, !item.isActive)}>
                    <SubmitButton pendingText="..." className="text-blue-600 hover:underline">
                      {item.isActive ? "Switch off" : "Switch on"}
                    </SubmitButton>
                  </form>
                  <form action={deleteAnnouncement.bind(null, item.id)}>
                    <SubmitButton pendingText="Deleting…" className="text-red-600 hover:underline">
                      Delete
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </li>
          ))}
          {announcements.length === 0 && (
            <p className="text-gray-500">No announcements yet.</p>
          )}
        </ul>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">Pop-up ads</h2>
          <Link
            href="/admin/announcements/popups/new"
            className="shrink-0 rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
          >
            + New pop-up
          </Link>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          Shown to students over the page once per sign-in. If several are live, they appear one
          after another as each is closed.
        </p>

        <ul className="flex flex-col gap-3">
          {popups.map((ad) => (
            <li key={ad.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ad.imageUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-md border border-gray-200 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="font-medium break-words">{ad.title || "Untitled pop-up"}</p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {formatWindow(ad.startsAt, ad.endsAt)}
                    </p>
                    {ad.linkUrl && (
                      <p className="mt-0.5 truncate text-xs text-gray-400">{ad.linkUrl}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-sm">
                  <StatusBadge item={ad} />
                  <Link
                    href={`/admin/announcements/popups/${ad.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                  <form action={togglePopupAdActive.bind(null, ad.id, !ad.isActive)}>
                    <SubmitButton pendingText="..." className="text-blue-600 hover:underline">
                      {ad.isActive ? "Switch off" : "Switch on"}
                    </SubmitButton>
                  </form>
                  <form action={deletePopupAd.bind(null, ad.id)}>
                    <SubmitButton pendingText="Deleting…" className="text-red-600 hover:underline">
                      Delete
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </li>
          ))}
          {popups.length === 0 && <p className="text-gray-500">No pop-up ads yet.</p>}
        </ul>
      </section>
    </div>
  );
}
