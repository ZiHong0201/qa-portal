"use client";

import { createContext, useContext, useTransition } from "react";
import { setUiLanguage } from "@/lib/actions/ui-language";
import type { UiLang } from "@/lib/i18n";

const UiLangContext = createContext<UiLang>("en");

/**
 * Hands the chosen language to client components. Set at the root from the
 * cookie, and pinned to "en" again by the admin layout - see lib/i18n.ts.
 */
export function UiLangProvider({ lang, children }: { lang: UiLang; children: React.ReactNode }) {
  return <UiLangContext.Provider value={lang}>{children}</UiLangContext.Provider>;
}

export function useUiLang(): UiLang {
  return useContext(UiLangContext);
}

const OPTIONS: { value: UiLang; label: string; name: string }[] = [
  { value: "en", label: "EN", name: "English" },
  { value: "zh", label: "中文", name: "中文 (Chinese)" },
];

/** The EN | 中文 switch at the top right of the student pages. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const lang = useUiLang();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label="Language / 语言"
      className={`inline-flex shrink-0 rounded-full border border-sky-200 bg-white p-0.5 text-xs font-semibold ${
        pending ? "opacity-60" : ""
      } ${className}`}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.name}
          aria-pressed={lang === o.value}
          disabled={pending}
          onClick={() => {
            if (lang !== o.value) startTransition(() => setUiLanguage(o.value));
          }}
          className={`rounded-full px-2.5 py-1 transition-colors ${
            lang === o.value ? "bg-sky-600 text-white" : "text-sky-700 hover:bg-sky-50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
