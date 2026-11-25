import { auth } from "@/auth";
import { Nav } from "@/components/nav";
import { PetCompanion } from "@/components/pet-companion";
import { InstallBanner } from "@/components/pwa";
import { QuestionHintProvider } from "@/components/question-hint-context";
import { DevDisclaimerBar } from "@/components/dev-disclaimer";
import { ResetWarning } from "@/components/reset-warning";
import { AnnouncementBar } from "@/components/announcement-bar";
import { PopupAds } from "@/components/popup-ads";
import {
  getLiveAnnouncements,
  getLivePopupAds,
} from "@/lib/announcements.server";
import { PetLookProvider } from "@/components/pet-look";
import { SuspendedNotice } from "@/components/suspended-notice";
import { getStudentNav } from "@/lib/points";
import { getUiLang } from "@/lib/i18n.server";
import { UiLangProvider } from "@/components/ui-language";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // auth() reads the JWT and touches no database, so resolving it first costs
  // nothing and lets the queries below go out together.
  const [session, picked] = await Promise.all([auth(), getUiLang()]);

  const isStudent = session?.user.role === "STUDENT";
  // Staff reach the scoreboard through here and read it in English, as they
  // do the rest of their pages.
  const lang = isStudent ? picked : "en";
  const [announcements, popupAds, nav] = await Promise.all([
    getLiveAnnouncements(),
    getLivePopupAds(),
    // The same cached query the nav makes, so checking for a suspension here
    // costs nothing extra: the nav below reuses this result. It also carries
    // the student's pet, which every decorative pet on the page draws.
    session && isStudent ? getStudentNav(session.user.id) : Promise.resolve(null),
  ]);

  // A suspended student sees only the notice, on every page under /dashboard.
  // Checked here rather than in the middleware because a suspension has to
  // bite on the next page load, and the session cookie would not learn of it
  // until the student logged in again.
  if (session && nav?.suspension) {
    return <SuspendedNotice name={session.user.name ?? ""} suspension={nav.suspension} />;
  }

  return (
    <UiLangProvider lang={lang}>
      <PetLookProvider value={nav?.pet ?? null}>
        <QuestionHintProvider>
          <div className="min-h-screen bg-gray-50">
            {/* Above the sticky nav, so the ticker scrolls away once read rather
              than holding a strip of every screen for the rest of the session. */}
            <AnnouncementBar announcements={announcements} />
            <Nav />
            {/* Below the sticky bar, not inside it, so it does not eat viewport
              height on a phone - it is still the first thing on every page. */}
            <DevDisclaimerBar lang={lang} />
            <ResetWarning lang={lang} />
            <div className="mx-auto max-w-4xl px-4 py-8">
              <InstallBanner />
              {children}
            </div>
            <PetCompanion />
            {session && <PopupAds ads={popupAds} userId={session.user.id} />}
          </div>
        </QuestionHintProvider>
      </PetLookProvider>
    </UiLangProvider>
  );
}
