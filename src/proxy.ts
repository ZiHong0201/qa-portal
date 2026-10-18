import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminOnlyPath } from "@/lib/permissions";
import { PORTAL_ORIGIN, isPaymentHost } from "@/lib/fees";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard");

  // YH-ideal-payment is this same app answering at its own address: its
  // front page is /payment, and the portal's pages are not served there.
  const onPaymentSite = isPaymentHost(req.headers.get("host"));
  if (onPaymentSite && (isAdminRoute || isDashboardRoute)) {
    return NextResponse.redirect(new URL(nextUrl.pathname + nextUrl.search, PORTAL_ORIGIN));
  }
  const isPaymentRoute =
    nextUrl.pathname === "/payment" ||
    nextUrl.pathname.startsWith("/payment/") ||
    (onPaymentSite && nextUrl.pathname === "/");

  // Fees are the admin's alone - not a teacher's, and never a student's.
  if (isPaymentRoute) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", nextUrl);
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (role !== "ADMIN") {
      const home = role === "TEACHER" ? "/admin" : "/dashboard";
      return NextResponse.redirect(new URL(home, onPaymentSite ? PORTAL_ORIGIN : nextUrl));
    }
    if (onPaymentSite && nextUrl.pathname === "/") {
      return NextResponse.rewrite(new URL("/payment", nextUrl));
    }
    return;
  }

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
  // "/" for the payment site's front page; on the portal it passes straight through.
  matcher: ["/", "/dashboard/:path*", "/admin/:path*", "/payment/:path*"],
};
