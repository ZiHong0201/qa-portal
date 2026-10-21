import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { dayKey } from "@/lib/check-in";
import { testimonialsCsv } from "@/lib/feedback";
import { starredTestimonials } from "@/lib/feedback.server";

/**
 * The starred testimonials as a file for the website: ?format=json (the
 * default) or ?format=csv.
 *
 * A route handler is outside the admin-only layout, so it checks the role
 * itself. The middleware turns teachers away from this path too; this is the
 * lock that holds if it ever does not.
 */
export async function GET(request: Request) {
  if (!isAdmin(await auth())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await starredTestimonials();
  const csv = new URL(request.url).searchParams.get("format") === "csv";
  const filename = `testimonials-${dayKey()}.${csv ? "csv" : "json"}`;

  return new NextResponse(csv ? testimonialsCsv(rows) : JSON.stringify(rows, null, 2) + "\n", {
    headers: {
      "Content-Type": csv ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
