"use server";

import { revalidatePath } from "next/cache";
import { requireStaff, visibleStudentsWhere } from "@/lib/permissions";
import { clearIntegritySignals, INTEGRITY_RETENTION_DAYS } from "@/lib/integrity.server";


/**
 * Clears on request. `scope` is "old" for anything past the retention window,
 * or "all" to wipe every signal now.
 *
 * Marks, answers and timestamps are untouched either way - this only removes
 * the behavioural columns.
 */
export async function clearIntegrityNow(scope: "old" | "all") {
  const session = await requireStaff();
  // A teacher clears the signals of their own centres' students only.
  await clearIntegritySignals(scope === "all" ? null : INTEGRITY_RETENTION_DAYS, {
    student: await visibleStudentsWhere(session),
  });
  revalidatePath("/admin/integrity");
}
