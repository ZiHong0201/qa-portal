"use client";

import { useRef, useState } from "react";
import { useUiLang } from "@/components/ui-language";
import { simulationsText } from "@/lib/text/simulations";

/**
 * The simulation itself, with a switch between its English and BM versions
 * when it has both, and a full-screen button - PhET sims are laid out for a
 * landscape screen and are cramped inside a phone-width page.
 */
export function SimulationPlayer({
  title,
  url,
  urlMs,
  prefersMalay,
}: {
  title: string;
  url: string;
  urlMs: string | null;
  prefersMalay: boolean;
}) {
  const t = simulationsText[useUiLang()];
  const [lang, setLang] = useState<"en" | "ms">(urlMs && prefersMalay ? "ms" : "en");
  const frame = useRef<HTMLDivElement>(null);
  const src = lang === "ms" && urlMs ? urlMs : url;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {urlMs && (
          <div
            role="group"
            aria-label={t.language}
            className="inline-flex rounded-full border border-sky-200 bg-white p-0.5 text-xs font-semibold"
          >
            {(["en", "ms"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={lang === value}
                onClick={() => setLang(value)}
                className={`rounded-full px-3 py-1 ${
                  lang === value ? "bg-sky-600 text-white" : "text-sky-700 hover:bg-sky-50"
                }`}
              >
                {value === "en" ? t.english : t.malay}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-3 text-sm">
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-sky-600 hover:text-sky-800 hover:underline"
          >
            {t.openInNewTab}
          </a>
          <button
            type="button"
            onClick={() => frame.current?.requestFullscreen?.()}
            className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 font-medium text-sky-700 hover:bg-sky-50"
          >
            ⛶ {t.fullScreen}
          </button>
        </div>
      </div>

      <div
        ref={frame}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-sky-200 bg-white shadow-sm sm:aspect-[16/10]"
      >
        <iframe
          // A new key reloads the frame when the language changes, rather
          // than leaving the old version's state behind.
          key={src}
          src={src}
          title={title}
          className="absolute inset-0 h-full w-full"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          allow="fullscreen"
          allowFullScreen
        />
      </div>
      <p className="mt-2 text-xs text-gray-500 sm:hidden">{t.phoneTip}</p>
    </div>
  );
}
