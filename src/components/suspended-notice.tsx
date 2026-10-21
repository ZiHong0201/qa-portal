import { signOut } from "@/auth";
import { SubmitButton } from "@/components/submit-button";
import type { Suspension } from "@/lib/points";
import { dateLocale } from "@/lib/i18n";
import { getUiLang } from "@/lib/i18n.server";
import { homeText } from "@/lib/text/home";

/**
 * What a suspended student sees instead of the portal - on every page of the
 * student side, with nothing else around it.
 *
 * They can still log in, on purpose: an account that simply stops accepting
 * its password reads as a forgotten password or a broken site, and leaves the
 * student and their parents guessing. This says what happened, why, and who
 * to talk to.
 *
 * Each part carries a second, smaller line in another language (BM under the
 * English, English under the Chinese) so a parent reading along can follow.
 */
export async function SuspendedNotice({
  name,
  suspension,
}: {
  name: string;
  suspension: Suspension;
}) {
  const lang = await getUiLang();
  const t = homeText[lang];
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-rose-100 bg-white p-7 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-2xl">
          🔒
        </div>
        <h1 className="text-xl font-bold text-gray-900">{t.suspendedTitle}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t.suspendedTitleSub}
          {name ? ` · ${name}` : ""}
        </p>

        <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-left">
          <p className="text-xs font-semibold tracking-wide text-rose-700 uppercase">{t.suspendedReason}</p>
          <p className="mt-1 whitespace-pre-wrap text-gray-900">{suspension.reason}</p>
          <p className="mt-2 text-xs text-rose-700/70">
            {t.suspendedSince(
              suspension.since.toLocaleDateString(dateLocale(lang), {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Asia/Kuala_Lumpur",
              })
            )}
          </p>
        </div>

        <p className="mt-5 text-sm text-gray-600">{t.suspendedContact}</p>
        <p className="text-xs text-gray-400">{t.suspendedContactSub}</p>

        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <SubmitButton
            pendingText={t.loggingOut}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t.logOut}
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
