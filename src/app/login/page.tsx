import { LoginForm } from "./login-form";
import { LoginBackground } from "./login-background";
import { CelebratingCat } from "@/components/celebrating-cat";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/";

  return (
    <main className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* Layer 1: a slow colour wash. Layer 2: the bubbles you can push around. */}
      <div className="animate-aurora fixed inset-0 -z-20 bg-[linear-gradient(120deg,#e0f2fe,#ede9fe,#dbeafe,#ccfbf1,#fae8ff)] bg-[length:400%_400%]" />
      <LoginBackground />

      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <CelebratingCat size="h-20 w-20" sparkleSize="text-lg" />
          <h1 className="mt-2 bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 bg-clip-text text-3xl font-bold text-transparent">
            Mr Tan Exercise Portal
          </h1>
          <p className="mt-1 text-sm text-slate-600">Log in to pick up where you left off.</p>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/70 p-6 shadow-xl backdrop-blur-md">
          <LoginForm callbackUrl={callbackUrl} />
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Tap the background to make a splash.
        </p>
      </div>
    </main>
  );
}
