"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { authLang } from "@/lib/password.server";
import { authText } from "@/lib/text/auth";

export type FormState = { error?: string };

export async function loginAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: authText[await authLang()].invalidLogin };
    }
    throw error;
  }

  return {};
}
