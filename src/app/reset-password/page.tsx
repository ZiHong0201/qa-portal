import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { ResetPasswordForm } from "@/components/password-forms";
import { checkResetToken } from "@/lib/password.server";

const WHY: Record<string, string> = {
  invalid: "This reset link is not valid. It may have been copied only in part.",
  expired: "This reset link has expired - links last an hour.",
  used: "This reset link has already been used, or a newer one has been sent since.",
};

// The token is in this page's address; no link out of it may carry it along.
export const metadata: Metadata = { referrer: "no-referrer" };

/** Opened from the link in a "forgot password" email. */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const state = await checkResetToken(token);

  return (
    <AuthCard title="Choose a new password">
      {state === "ok" ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{WHY[state]}</p>
          <Link href="/forgot-password" className="text-center text-sm font-medium text-sky-700 hover:underline">
            Ask for a new link
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
