import type { NextRequest } from "next/server";
import { getLiveState } from "@/lib/live.server";

/**
 * The game state every phone polls. Public: players have no account.
 *
 * The response is the same for every player, which is what makes a hundred of
 * them affordable. Vercel's CDN is told to keep it for one second, so however
 * many phones are polling, the database sees about one request a second per
 * game rather than fifty. Browsers are told not to cache it at all - a phone
 * holding on to an old copy would sit on a question that has already closed.
 *
 * A second of staleness is safe because nothing time-critical relies on it:
 * the countdown runs on each phone from the deadline, and the server checks
 * that deadline itself when an answer arrives.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/live/[code]">) {
  const { code } = await ctx.params;
  if (!/^\d{6}$/.test(code)) {
    return Response.json({ error: "There is no quiz with that code." }, { status: 404 });
  }

  const state = await getLiveState(code);
  if (!state) {
    return Response.json({ error: "There is no quiz with that code." }, { status: 404 });
  }

  return Response.json(state, {
    headers: {
      "Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "max-age=1",
    },
  });
}
