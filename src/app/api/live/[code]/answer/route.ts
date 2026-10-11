import type { NextRequest } from "next/server";
import { recordAnswer } from "@/lib/live.server";

/** Lock in an answer to the open question. Public; the token says who. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/live/[code]/answer">) {
  const { code } = await ctx.params;
  if (!/^\d{6}$/.test(code)) {
    return Response.json({ error: "There is no quiz with that code." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) ?? {};
  const result = await recordAnswer(code, body);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
