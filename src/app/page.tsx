import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { InteractiveBackdrop } from "@/components/interactive-background";
import { BrandAvatar } from "@/components/brand-avatar";
import { InstallButton } from "@/components/pwa";

export default async function Home() {
  const session = await auth();
  if (session) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    // See the login page for why: no bounce, no accidental text selection,
    // and no scrolling unless the content truly cannot fit.
    <main className="relative flex h-dvh flex-col items-center justify-center overflow-hidden overscroll-none px-4 py-10 short:py-4 text-center touch-manipulation select-none">
      <InteractiveBackdrop />

      <div className="short:hidden">
        <BrandAvatar size={112} />
      </div>

      <h1 className="mt-3 bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
        Mr Tan
        <br />
        Exercise Portal
      </h1>

      <p className="mt-3 max-w-md text-lg text-slate-600 short:mt-2 tiny:hidden">
        Answer questions, earn marks, and watch your progress climb.
      </p>

      <Link
        href="/login"
        className="mt-7 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-7 py-3 short:mt-4 font-semibold text-white shadow-lg transition-all hover:from-sky-500 hover:to-indigo-500 hover:shadow-xl active:scale-[0.98]"
      >
        Log in
      </Link>

      {/* Renders nothing unless this device can actually act on it. */}
      <div className="mt-4">
        <InstallButton />
      </div>
    </main>
  );
}
