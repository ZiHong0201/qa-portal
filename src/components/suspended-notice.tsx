import { signOut } from "@/auth";
import { SubmitButton } from "@/components/submit-button";
import type { Suspension } from "@/lib/points";

/**
 * What a suspended student sees instead of the portal - on every page of the
 * student side, with nothing else around it.
 *
 * They can still log in, on purpose: an account that simply stops accepting
 * its password reads as a forgotten password or a broken site, and leaves the
 * student and their parents guessing. This says what happened, why, and who
 * to talk to.
 */
export function SuspendedNotice({ name, suspension }: { name: string; suspension: Suspension }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-rose-100 bg-white p-7 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-2xl">
          🔒
        </div>
        <h1 className="text-xl font-bold text-gray-900">Your account has been suspended</h1>
        <p className="mt-1 text-sm text-gray-500">
          Akaun anda telah digantung
          {name ? ` · ${name}` : ""}
        </p>

        <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-left">
          <p className="text-xs font-semibold tracking-wide text-rose-700 uppercase">Reason / Sebab</p>
          <p className="mt-1 whitespace-pre-wrap text-gray-900">{suspension.reason}</p>
          <p className="mt-2 text-xs text-rose-700/70">
            Since{" "}
            {suspension.since.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Asia/Kuala_Lumpur",
            })}
          </p>
        </div>

        <p className="mt-5 text-sm text-gray-600">
          Please contact admin if you think this is a mistake.
        </p>
        <p className="text-xs text-gray-400">
          Sila hubungi admin jika anda rasa ini satu kesilapan.
        </p>

        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <SubmitButton
            pendingText="Logging out…"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Log out
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
