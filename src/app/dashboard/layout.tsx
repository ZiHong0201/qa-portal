import { auth } from "@/auth";
import { Nav } from "@/components/nav";
import { CatCompanion } from "@/components/cat-companion";
import { InstallBanner } from "@/components/pwa";
import { QuestionHintProvider } from "@/components/question-hint-context";
import { DevDisclaimerBar } from "@/components/dev-disclaimer";
import { AnnouncementBar } from "@/components/announcement-bar";
import { PopupAds } from "@/components/popup-ads";
import { getLiveAnnouncements, getLivePopupAds } from "@/lib/announcements.server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, announcements, popupAds] = await Promise.all([
    auth(),
    getLiveAnnouncements(),
    getLivePopupAds(),
  ]);

  return (
    <QuestionHintProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Above the sticky nav, so the ticker scrolls away once read rather
            than holding a strip of every screen for the rest of the session. */}
        <AnnouncementBar announcements={announcements} />
        <Nav />
        {/* Below the sticky bar, not inside it, so it does not eat viewport
            height on a phone - it is still the first thing on every page. */}
        <DevDisclaimerBar />
        <div className="mx-auto max-w-4xl px-4 py-8">
          <InstallBanner />
          {children}
        </div>
        <CatCompanion />
        {session && <PopupAds ads={popupAds} userId={session.user.id} />}
      </div>
    </QuestionHintProvider>
  );
}
