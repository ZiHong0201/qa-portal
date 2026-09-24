import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";

/**
 * Guards a section of /admin that teachers may not enter.
 *
 * Re-exported as the `layout.tsx` of each admin-only section rather than
 * pasted into every page, because a section is the unit that matters: a new
 * /admin/catalogue/[id]/duplicate route added later inherits the guard without
 * anyone having to remember it. A page-by-page check is one forgotten import
 * away from a hole, and the hole is invisible - the page looks fine.
 *
 * The middleware already turns teachers away from these paths. This is the
 * second lock: middleware matches on URL, and a redirect there protects the
 * navigation but not, say, a page rendered through some future route the
 * matcher does not cover. Both are cheap; only one of them has to hold.
 *
 * Teachers land back on /admin rather than an error. They have not done
 * anything wrong - the page simply is not theirs.
 */
export default async function AdminOnlyLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!isAdmin(session)) redirect("/admin");
  return <>{children}</>;
}
