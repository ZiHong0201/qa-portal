import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getStudentBalance } from "@/lib/points";
import { SubmitButton } from "@/components/submit-button";
import { NavDrawer, type NavLink } from "@/components/nav-drawer";

const STUDENT_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/sets", label: "My Sets" },
  { href: "/dashboard/catalogue", label: "Catalogue" },
  { href: "/dashboard/leaderboard", label: "Scoreboard" },
];

const ADMIN_LINKS: NavLink[] = [
  { href: "/admin/sets", label: "Sets" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/catalogue", label: "Catalogue" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/review", label: "Review" },
  { href: "/admin/master-data", label: "Master Data" },
  { href: "/dashboard/leaderboard", label: "Scoreboard" },
];

export async function Nav() {
  const session = await auth();
  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN";
  const links = isAdmin ? ADMIN_LINKS : STUDENT_LINKS;

  let balance: number | null = null;
  if (!isAdmin) {
    balance = (await getStudentBalance(session.user.id)).balance;
  }

  // The admin pages are laid out wider than the student ones, so the bar
  // matches whichever it sits above instead of ending short of the content.
  const width = isAdmin ? "max-w-screen-2xl" : "max-w-4xl";

  const logOut = (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <SubmitButton
        pendingText="Logging out…"
        className="w-full rounded-lg border border-sky-200 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 md:w-auto md:py-1.5"
      >
        Log out
      </SubmitButton>
    </form>
  );

  return (
    // Solid rather than translucent-with-blur on purpose: backdrop-filter
    // makes an element a containing block for fixed-position descendants, which
    // trapped the drawer inside this 64px bar instead of the viewport.
    <header className="sticky top-0 z-30 border-b border-sky-200 bg-white">
      <div className={`mx-auto flex ${width} items-center gap-3 px-4 py-3`}>
        {/* Phone: hamburger + drawer. Hidden from md up. */}
        <NavDrawer
          links={links}
          userName={session.user.name ?? ""}
          balance={balance}
        >
          {logOut}
        </NavDrawer>

        <Link
          href={isAdmin ? "/admin" : "/dashboard"}
          className="leading-tight font-semibold text-sky-950"
        >
          Mr Tan
          <br />
          <span className="text-xs font-normal text-gray-500">
            Exercise Portal
          </span>
        </Link>

        {/* Phone: just the points badge, so the bar stays one tidy row. */}
        {balance !== null && (
          <span className="ml-auto rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700 md:hidden">
            {balance.toLocaleString()}
            <span className="ml-1 text-xs font-normal text-sky-500">pts</span>
          </span>
        )}

        {/* Desktop: the full horizontal bar, unchanged. */}
        <nav className="ml-auto hidden flex-wrap items-center gap-x-4 gap-y-1 text-sm md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:underline">
              {link.label}
            </Link>
          ))}
          {balance !== null && (
            <span className="font-medium text-gray-700">
              {balance.toLocaleString()} points
            </span>
          )}
          <span className="text-gray-500">{session.user.name}</span>
          {logOut}
        </nav>
      </div>
    </header>
  );
}
