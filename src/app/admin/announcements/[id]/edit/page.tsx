import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AnnouncementForm } from "../../announcement-form";
import { updateAnnouncement } from "@/lib/actions/announcements";
import { dateToLocalInput } from "@/lib/announcements";

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await prisma.announcement.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Edit announcement</h1>
      <AnnouncementForm
        action={updateAnnouncement.bind(null, item.id)}
        submitLabel="Save changes"
        initial={{
          message: item.message,
          // Formatted server-side so the form stays free of timezone maths.
          startsAt: dateToLocalInput(item.startsAt),
          endsAt: dateToLocalInput(item.endsAt),
          isActive: item.isActive,
        }}
      />
    </div>
  );
}
