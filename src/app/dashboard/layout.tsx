import { Nav } from "@/components/nav";
import { CatCompanion } from "@/components/cat-companion";
import { PwaRegister } from "@/components/pwa-register";
import { QuestionHintProvider } from "@/components/question-hint-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QuestionHintProvider>
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <div className="mx-auto max-w-4xl px-4 py-8">
          <PwaRegister />
          {children}
        </div>
        <CatCompanion />
      </div>
    </QuestionHintProvider>
  );
}
