import type { NextRequest } from "next/server";
import { joinQuiz } from "@/lib/live.server";

/** Join a game with a name. Public; the reply carries the player's token. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/live/[code]/join">) {
  const { code } = await ctx.params;
  if (!/^\d{6}$/.test(code)) {
    return Response.json({ error: "There is no quiz with that code." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
  const result = await joinQuiz(code, body?.name);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });

  const { quizId, participantId, token, name } = result;
  return Response.json(
    { quizId, participantId, token, name },
    { headers: { "Cache-Control": "no-store" } }
  );
}
