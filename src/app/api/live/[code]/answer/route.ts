import type { NextRequest } from "next/server";
import { getUiLang } from "@/lib/i18n.server";
import { liveText } from "@/lib/text/live";
import { recordAnswer } from "@/lib/live.server";

/** Lock in an answer to the open question. Public; the token says who. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/live/[code]/answer">) {
  const { code } = await ctx.params;
  const lang = await getUiLang();
  if (!/^\d{6}$/.test(code)) {
    return Response.json({ error: liveText[lang].errNoQuiz }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) ?? {};
  const result = await recordAnswer(code, body, lang);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
