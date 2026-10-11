import type { Metadata } from "next";
import { CodeEntry } from "./code-entry";

export const metadata: Metadata = { title: "Join a quiz – Mr Tan" };

/**
 * Where a player lands without the QR code: type the six digits off the
 * screen. Public - no account, no login - like everything under /play.
 */
export default function PlayPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-sky-500 to-indigo-600 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl">
        <h1 className="text-2xl font-bold text-sky-950">Join a quiz</h1>
        <p className="mt-1 text-sm text-gray-500">Type the code on the screen.</p>
        <CodeEntry />
      </div>
      <p className="mt-6 text-xs text-white/70">Mr Tan · Exercise Portal</p>
    </main>
  );
}
