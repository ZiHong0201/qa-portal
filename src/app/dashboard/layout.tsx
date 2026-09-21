import { Nav } from "@/components/nav";
import { CatCompanion } from "@/components/cat-companion";
import { InstallBanner } from "@/components/pwa";
import { QuestionHintProvider } from "@/components/question-hint-context";
import { DevDisclaimerBar } from "@/components/dev-disclaimer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QuestionHintProvider>
      <div className="min-h-screen bg-gray-50">
        <Nav />
        {/* Below the sticky bar, not inside it, so it does not eat viewport
            height on a phone - it is still the first thing on every page. */}
        <DevDisclaimerBar />
        <div className="mx-auto max-w-4xl px-4 py-8">
          <InstallBanner />
          {children}
        </div>
        <CatCompanion />
      </div>
    </QuestionHintProvider>
  );
}
