import { NextResponse } from "next/server";
import { clearIntegritySignals, INTEGRITY_RETENTION_DAYS } from "@/lib/integrity.server";
import { deleteOldLiveQuizzes } from "@/lib/live.server";
import { LIVE_RETENTION_DAYS } from "@/lib/live";

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
 *
 * Also clears out old live quizzes. That is a separate retention rule riding
 * on the same daily job because Vercel's Hobby plan allows two cron jobs and
 * both are taken; the two share nothing but the schedule.
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
  const liveQuizzesDeleted = await deleteOldLiveQuizzes();
  return NextResponse.json({
    cleared,
    retentionDays: INTEGRITY_RETENTION_DAYS,
    liveQuizzesDeleted,
    liveRetentionDays: LIVE_RETENTION_DAYS,
  });
}
