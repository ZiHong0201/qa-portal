"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { clearIntegritySignals, INTEGRITY_RETENTION_DAYS } from "@/lib/integrity.server";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Forbidden");
}

/**
 * Clears on request. `scope` is "old" for anything past the retention window,
 * or "all" to wipe every signal now.
 *
 * Marks, answers and timestamps are untouched either way - this only removes
 * the behavioural columns.
 */
export async function clearIntegrityNow(scope: "old" | "all") {
  await requireAdmin();
  await clearIntegritySignals(scope === "all" ? null : INTEGRITY_RETENTION_DAYS);
  revalidatePath("/admin/integrity");
}
