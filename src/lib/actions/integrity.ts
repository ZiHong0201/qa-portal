"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/permissions";
import { clearIntegritySignals, INTEGRITY_RETENTION_DAYS } from "@/lib/integrity.server";


/**
 * Clears on request. `scope` is "old" for anything past the retention window,
 * or "all" to wipe every signal now.
 *
 * Marks, answers and timestamps are untouched either way - this only removes
 * the behavioural columns.
 */
export async function clearIntegrityNow(scope: "old" | "all") {
  await requireStaff();
  await clearIntegritySignals(scope === "all" ? null : INTEGRITY_RETENTION_DAYS);
  revalidatePath("/admin/integrity");
}
