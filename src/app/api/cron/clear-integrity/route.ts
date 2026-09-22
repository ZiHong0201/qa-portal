import { NextResponse } from "next/server";
import { clearIntegritySignals, INTEGRITY_RETENTION_DAYS } from "@/lib/integrity.server";

/**
 * Scheduled wipe of integrity signals past the retention window.
 *
 * Runs daily rather than monthly on purpose. A monthly job gives every signal
 * a lifetime somewhere between one day and two months depending on when it
 * happened to be recorded; running daily against a fixed age gives every
 * student the same 30 days, which is what a retention promise should mean.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Without that secret
 * configured the route refuses outright rather than defaulting to open - this
 * endpoint destroys data, so an unauthenticated caller must never reach it.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured; refusing to run." },
      { status: 503 }
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cleared = await clearIntegritySignals(INTEGRITY_RETENTION_DAYS);
  return NextResponse.json({ cleared, retentionDays: INTEGRITY_RETENTION_DAYS });
}
