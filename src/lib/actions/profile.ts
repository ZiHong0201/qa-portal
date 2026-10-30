"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, unstable_update } from "@/auth";
import { prisma } from "@/lib/prisma";
import { authLang, type Result } from "@/lib/password.server";
import { isSuspended, suspendedError } from "@/lib/suspension";
import { authText } from "@/lib/text/auth";

/** Longest name an account may have - the same limit staff work to. */
const MAX_NAME = 100;

/**
 * Changes the name of whoever is logged in. Anyone may change their own;
 * staff still change other people's from the admin pages.
 *
 * Refused while suspended, like every other student action: the name is shown
 * to classmates on the scoreboard, so it is not a private setting.
 */
export async function changeMyName(_prev: Result, formData: FormData): Promise<Result> {
  const session = await auth();
  const lang = await authLang();
  const t = authText[lang];
  if (!session) return { error: t.logInAgainFirst };

  const raw = formData.get("name");
  // Runs of spaces collapse, so "  Sam   Lee " is stored as "Sam Lee".
  const name = (typeof raw === "string" ? raw : "").replace(/\s+/g, " ").trim();
  if (!name) return { error: t.enterName };
  if (name.length > MAX_NAME) return { error: t.nameTooLong };
  if (await isSuspended(session.user.id)) return { error: suspendedError(lang) };

  await prisma.user.update({ where: { id: session.user.id }, data: { name } });
  // The name is carried in the session cookie; refresh it so the bar at the
  // top shows the new one at once rather than a minute later.
  await unstable_update({});
  // The nav, the scoreboard and the admin's lists all show it.
  revalidatePath("/", "layout");
  redirect("/account?saved=name");
}
