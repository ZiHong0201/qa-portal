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
    // h-dvh + overflow-y-auto means the page only scrolls if it genuinely
    // cannot fit (a short landscape phone); on a normal screen there is no
    // scroll to fight with. overscroll-none kills the rubber-band bounce and
    // pull-to-refresh, and select-none stops a drag on the background turning
    // into a text selection - both made the bubbles awkward to play with.
    <main className="relative flex h-dvh flex-col items-center justify-center overflow-y-auto overscroll-none px-4 py-10 touch-manipulation select-none">
      <InteractiveBackdrop />

      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <CelebratingCat size="h-20 w-20" sparkleSize="text-lg" />
          <h1 className="mt-2 bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 bg-clip-text text-3xl font-bold text-transparent">
            Mr Tan Exercise Portal
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Log in to pick up where you left off.
          </p>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/70 p-6 shadow-xl backdrop-blur-md select-text">
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </div>
    </main>
  );
}
