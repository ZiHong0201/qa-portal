import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isStaff } from "@/lib/permissions";
import { Nav } from "@/components/nav";
import { InstallBanner } from "@/components/pwa";
import { DevDisclaimerBar } from "@/components/dev-disclaimer";
import { ResetWarning } from "@/components/reset-warning";
import { AnnouncementBar } from "@/components/announcement-bar";
import { getLiveAnnouncements } from "@/lib/announcements.server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!isStaff(session)) redirect("/dashboard");

  // The ticker shows here too, so an admin can see what students are seeing.
  // Pop-ups deliberately do not - they are aimed at students, and an admin
  // editing them would be interrupted by their own work on every sign-in.
  const announcements = await getLiveAnnouncements();

  return (
    <div className="min-h-screen bg-gray-50">
      <AnnouncementBar announcements={announcements} />
      <Nav />
      <DevDisclaimerBar />
      <ResetWarning />
      <div className="mx-auto max-w-screen-2xl px-4 py-8">
        <InstallBanner />
        {children}
      </div>
    </div>
  );
}
