import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminOnlyPath } from "@/lib/permissions";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard");

  if ((isAdminRoute || isDashboardRoute) && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Students never reach /admin at all.
  if (isAdminRoute && role !== "ADMIN" && role !== "TEACHER") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Teachers reach /admin but not the parts that configure the portal. This
  // has to be checked per path rather than at the layout, because the layout
  // now admits both roles - without it a teacher could simply type
  // /admin/reset and be let straight through.
  if (isAdminRoute && role === "TEACHER" && isAdminOnlyPath(nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/admin", nextUrl));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
