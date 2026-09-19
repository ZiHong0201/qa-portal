import { LoginForm } from "./login-form";
import { InteractiveBackdrop } from "@/components/interactive-background";
import { CelebratingCat } from "@/components/celebrating-cat";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/";

  return (
    // Pinned to the viewport: h-dvh with overflow-hidden, so there is nothing
    // to scroll and a drag on the background only moves the bubbles.
    // overscroll-none kills the rubber-band bounce and pull-to-refresh, and
    // select-none stops a drag turning into a text selection.
    //
    // Because nothing scrolls, the page must always fit. On a short screen
    // (a phone held sideways) the "short" variants drop the cat and shrink
    // the type so the form and its button stay on screen.
    <main className="relative flex h-dvh flex-col items-center justify-center overflow-hidden overscroll-none px-4 py-10 short:py-4 touch-manipulation select-none">
      <InteractiveBackdrop />

      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center short:mb-2">
          <div className="short:hidden">
            <CelebratingCat size="h-20 w-20" sparkleSize="text-lg" />
          </div>
          <h1 className="mt-2 bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 bg-clip-text text-3xl font-bold text-transparent short:mt-0">
            Mr Tan Exercise Portal
          </h1>
          <p className="mt-1 text-sm text-slate-600 short:hidden">
            Log in to pick up where you left off.
          </p>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/70 p-6 shadow-xl backdrop-blur-md select-text short:p-4">
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </div>
    </main>
  );
}
