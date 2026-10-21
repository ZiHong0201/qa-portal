"use server";

import { headers } from "next/headers";
import { auth } from "@/auth";
import { authText } from "@/lib/text/auth";
import {
  type Result,
  authLang,
  changePassword,
  requestPasswordReset,
  resetLinkOrigin,
  resetPassword,
} from "@/lib/password.server";

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

export async function changeMyPassword(_prev: Result, formData: FormData): Promise<Result> {
  const session = await auth();
  const lang = await authLang();
  if (!session) return { error: authText[lang].logInAgain };
  return changePassword(
    session.user.id,
    text(formData.get("current")),
    text(formData.get("password")),
    text(formData.get("confirm")),
    lang
  );
}

export async function forgotPassword(_prev: Result, formData: FormData): Promise<Result> {
  const h = await headers();
  await requestPasswordReset(text(formData.get("email")), resetLinkOrigin(h.get("host"), h.get("x-forwarded-proto")));
  // The same answer whether or not the email has an account. The email
  // itself stays in English.
  return { success: authText[await authLang()].resetSent };
}

export async function resetForgottenPassword(token: string, _prev: Result, formData: FormData): Promise<Result> {
  return resetPassword(token, text(formData.get("password")), text(formData.get("confirm")), await authLang());
}
