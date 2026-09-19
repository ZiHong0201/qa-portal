import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { InteractiveBackdrop } from "@/components/interactive-background";
import { CelebratingCat } from "@/components/celebrating-cat";

export default async function Home() {
  const session = await auth();
  if (session) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <main className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden px-4 py-10 text-center">
      <InteractiveBackdrop />

      <CelebratingCat size="h-28 w-28" sparkleSize="text-2xl" />

      <h1 className="mt-3 bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
        Mr Tan
        <br />
        Exercise Portal
      </h1>

      <p className="mt-3 max-w-md text-lg text-slate-600">
        Answer questions, earn marks, and watch your progress climb.
      </p>

      <Link
        href="/login"
        className="mt-7 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-7 py-3 font-semibold text-white shadow-lg transition-all hover:from-sky-500 hover:to-indigo-500 hover:shadow-xl active:scale-[0.98]"
      >
        Log in
      </Link>

      <p className="mt-6 text-xs text-slate-500">Tap the background to make a splash.</p>
    </main>
  );
}
