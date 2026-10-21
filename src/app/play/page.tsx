import type { Metadata } from "next";
import { getUiLang } from "@/lib/i18n.server";
import { liveText } from "@/lib/text/live";
import { LanguageToggle } from "@/components/ui-language";
import { CodeEntry } from "./code-entry";

export async function generateMetadata(): Promise<Metadata> {
  return { title: liveText[await getUiLang()].metaJoin };
}

/**
 * Where a player lands without the QR code: type the six digits off the
 * screen. Public - no account, no login - like everything under /play.
 */
export default async function PlayPage() {
  const t = liveText[await getUiLang()];
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-sky-500 to-indigo-600 px-4">
      {/* Here rather than in the game itself, where it would only distract. */}
      <LanguageToggle className="absolute top-4 right-4" />
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-sky-950">{t.joinHeading}</h1>
        <p className="mt-1 text-sm text-gray-500">{t.typeCode}</p>
        <CodeEntry />
      </div>
      <p className="mt-6 text-xs text-white/70">{t.footer}</p>
    </main>
  );
}
