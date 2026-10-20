"use server";

import { headers } from "next/headers";
import { auth } from "@/auth";
import {
  type Result,
  changePassword,
  requestPasswordReset,
  resetLinkOrigin,
  resetPassword,
} from "@/lib/password.server";

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

export async function changeMyPassword(_prev: Result, formData: FormData): Promise<Result> {
  const session = await auth();
  if (!session) return { error: "Log in again, then change your password." };
  return changePassword(
    session.user.id,
    text(formData.get("current")),
    text(formData.get("password")),
    text(formData.get("confirm"))
  );
}

export async function forgotPassword(_prev: Result, formData: FormData): Promise<Result> {
  const h = await headers();
  await requestPasswordReset(text(formData.get("email")), resetLinkOrigin(h.get("host"), h.get("x-forwarded-proto")));
  // The same answer whether or not the email has an account.
  return {
    success:
      "If that email belongs to an account, a link to reset the password is on its way. Check the inbox, and the spam folder too.",
  };
}

export async function resetForgottenPassword(token: string, _prev: Result, formData: FormData): Promise<Result> {
  return resetPassword(token, text(formData.get("password")), text(formData.get("confirm")));
}
