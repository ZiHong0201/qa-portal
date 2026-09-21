import { AnnouncementForm } from "../announcement-form";
import { createAnnouncement } from "@/lib/actions/announcements";

export default function NewAnnouncementPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">New announcement</h1>
      <AnnouncementForm action={createAnnouncement} submitLabel="Create announcement" />
    </div>
  );
}
