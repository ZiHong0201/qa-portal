import { InteractiveBackdrop } from "@/components/interactive-background";

/**
 * The frame shared by the login page's companions - forgot password, reset
 * password, change password: the same backdrop and frosted card, so moving
 * between them feels like one place.
 */
export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <InteractiveBackdrop />
      <div className="w-full max-w-sm">
        <h1 className="mb-5 bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 bg-clip-text text-center text-3xl font-bold text-transparent">
          {title}
        </h1>
        <div className="rounded-2xl border border-white/70 bg-white/70 p-6 shadow-xl backdrop-blur-md">{children}</div>
      </div>
    </main>
  );
}
