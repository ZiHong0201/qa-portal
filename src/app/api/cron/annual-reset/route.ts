import { NextResponse } from "next/server";
import { RESET_AT } from "@/lib/reset";
import { runReset, scheduledResetDone } from "@/lib/reset.server";

/**
 * Carries out the scheduled reset once the date has passed.
 *
 * Runs daily and checks the date itself rather than being scheduled for the
 * day: a cron that fires exactly once, on one morning of one year, has no way
 * of catching up if that single run fails or the project happens to be
 * sleeping. Checking every day means a missed run simply happens tomorrow.
 *
 * scheduledResetDone is what stops it wiping the portal again every morning
 * for the rest of time once the date is behind us.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (new Date() < RESET_AT) {
    return NextResponse.json({ ran: false, reason: "not due yet", due: RESET_AT.toISOString() });
  }
  if (await scheduledResetDone()) {
    return NextResponse.json({ ran: false, reason: "already done" });
  }

  const { counts, snapshotUrl } = await runReset({ scheduledFor: RESET_AT });
  return NextResponse.json({ ran: true, counts, snapshotUrl });
}
