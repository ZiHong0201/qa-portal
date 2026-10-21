import type { NextRequest } from "next/server";
import { getUiLang } from "@/lib/i18n.server";
import { liveText } from "@/lib/text/live";
import { joinQuiz } from "@/lib/live.server";

/** Join a game with a name. Public; the reply carries the player's token. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/live/[code]/join">) {
  const { code } = await ctx.params;
  const lang = await getUiLang();
  if (!/^\d{6}$/.test(code)) {
    return Response.json({ error: liveText[lang].errNoQuiz }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
  const result = await joinQuiz(code, body?.name, lang);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });

  const { quizId, participantId, token, name } = result;
  return Response.json(
    { quizId, participantId, token, name },
    { headers: { "Cache-Control": "no-store" } }
  );
}
