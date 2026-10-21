import { headers } from "next/headers";
import Link from "next/link";
import { LoginForm } from "./login-form";
import { PAYMENT_SITE_NAME, isPaymentHost } from "@/lib/fees";
import { InteractiveBackdrop } from "@/components/interactive-background";
import { BrandAvatar } from "@/components/brand-avatar";
import { DevDisclaimerNote } from "@/components/dev-disclaimer";
import { LanguageToggle } from "@/components/ui-language";
import { getUiLang } from "@/lib/i18n.server";
import { authText } from "@/lib/text/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/";
  // The payment site shares this login; it says which site it is signing in to.
  const onPaymentSite = isPaymentHost((await headers()).get("host"));
  // The payment site is the admin's alone and stays in English.
  const lang = onPaymentSite ? "en" : await getUiLang();
  const t = authText[lang];

  return (
    // Pinned to the viewport: h-dvh with overflow-hidden, so there is nothing
    // to scroll and a drag on the background only moves the bubbles.
    // overscroll-none kills the rubber-band bounce and pull-to-refresh, and
    // select-none stops a drag turning into a text selection.
    //
    // Because nothing scrolls, the page must always fit. On a short screen
    // (a phone held sideways) the "short" variants drop the portrait and shrink
    // the type so the form and its button stay on screen.
    <main className="relative flex h-dvh flex-col items-center justify-center overflow-hidden overscroll-none px-4 py-10 short:py-4 touch-manipulation select-none">
      <InteractiveBackdrop />
      {!onPaymentSite && <LanguageToggle className="absolute top-4 right-4 z-10" />}

      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center short:mb-2">
          <div className="short:hidden">
            <BrandAvatar size={80} />
          </div>
          <h1 className="mt-2 bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 bg-clip-text text-3xl font-bold text-transparent short:mt-0">
            {onPaymentSite ? PAYMENT_SITE_NAME : t.portalName}
          </h1>
          <p className="mt-1 text-sm text-slate-600 short:hidden">
            {onPaymentSite ? "Admin login, for tuition fees." : t.loginTagline}
          </p>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/70 p-6 shadow-xl backdrop-blur-md select-text short:p-4">
          <LoginForm callbackUrl={callbackUrl} lang={lang} />
          {/* Student accounts only - the payment site's login is for the admin. */}
          {!onPaymentSite && (
            <p className="mt-4 text-center text-sm text-slate-600 short:mt-2">
              {t.noAccount}{" "}
              <Link href="/request-account" className="font-medium text-sky-700 hover:underline">
                {t.requestOne}
              </Link>
            </p>
          )}
        </div>
      </div>

      <DevDisclaimerNote lang={lang} />
    </main>
  );
}
