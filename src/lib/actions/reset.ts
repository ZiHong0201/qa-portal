"use server";

import { auth } from "@/auth";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/permissions";
import { runReset } from "@/lib/reset.server";

/**
 * Resets the portal on request.
 *
 * Requires the admin to type the confirmation phrase. This deletes every mark
 * every student has earned and cannot be undone, so a misplaced click must not
 * be enough to trigger it.
 */
export async function resetPortalNow(
  _prev: { error?: string; success?: string },
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  // Returns the refusal rather than throwing, unlike requireAdmin: this is a
  // form action, and the message belongs in the form next to the button.
  const session = await auth();
  if (!isAdmin(session)) return { error: "Forbidden" };

  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "RESET") {
    return { error: 'Type RESET in the box to confirm.' };
  }

  // scheduledFor stays null: a manual reset must not count as the scheduled
  // one, or resetting in March would quietly cancel the January wipe.
  const { counts, snapshotUrl } = await runReset({
    scheduledFor: null,
    triggeredById: session.user.id,
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard", "layout");

  return {
    success: `Reset complete - ${counts.submissions.toLocaleString()} answers, ${counts.checkIns} check-ins and ${counts.redemptions} redemptions cleared. Snapshot saved to ${snapshotUrl}`,
  };
}
