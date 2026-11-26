import { AnnouncementForm } from "../announcement-form";
import { createAnnouncement } from "@/lib/actions/announcements";
import { getCentres } from "@/lib/centres";

export default async function NewAnnouncementPage() {
  const centres = await getCentres();
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">New announcement</h1>
      <AnnouncementForm action={createAnnouncement} centres={centres} submitLabel="Create announcement" />
    </div>
  );
}
