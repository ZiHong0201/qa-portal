import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getStudentNav } from "@/lib/points";
import { SubmitButton } from "@/components/submit-button";
import { NavDrawer, type NavLink } from "@/components/nav-drawer";
import { LanguageToggle } from "@/components/ui-language";
import { getUiLang } from "@/lib/i18n.server";
import { shellText } from "@/lib/text/shell";

// Students read the bar in the language they picked; staff always in English,
// since their pages are not translated.
type ShellText = (typeof shellText)["en"];
const studentLinks = (t: ShellText): NavLink[] => [
  { href: "/dashboard", label: t.home },
  { href: "/dashboard/sets", label: t.mySets },
  { href: "/dashboard/catalogue", label: t.giftExchange },
  { href: "/dashboard/leaderboard", label: t.scoreboard },
];

// The teaching half of /admin: everything a teacher and an admin both use.
const STAFF_LINKS: NavLink[] = [
  { href: "/admin/sets", label: "Sets" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/review", label: "Review" },
  { href: "/admin/integrity", label: "Integrity" },
  { href: "/admin/live", label: "Live Quiz" },
  { href: "/dashboard/leaderboard", label: "Scoreboard" },
];

// Spelled out rather than composed from the two lists above, because the
// admin bar has an order the admin is used to reading and it is not the
// concatenation of the other two.
const ADMIN_LINKS: NavLink[] = [
  { href: "/admin/sets", label: "Sets" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/catalogue", label: "Gift Exchange" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/pet", label: "Virtual Cat" },
  { href: "/admin/review", label: "Review" },
  { href: "/admin/integrity", label: "Integrity" },
  { href: "/admin/live", label: "Live Quiz" },
  { href: "/admin/master-data", label: "Master Data" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/reset", label: "Reset" },
  { href: "/dashboard/leaderboard", label: "Scoreboard" },
];

export async function Nav() {
  const session = await auth();
  if (!session) return null;

  const role = session.user.role;
  const isAdmin = role === "ADMIN";
  const isStaff = isAdmin || role === "TEACHER";

  const t = shellText[isStaff ? "en" : await getUiLang()];

  let balance: number | null = null;
  let links = isAdmin ? ADMIN_LINKS : isStaff ? STAFF_LINKS : studentLinks(t);
  if (!isStaff) {
    // One round trip for the marks total and the pet flag together. The nav
    // renders on every page, so anything extra here is paid for everywhere.
    const nav = await getStudentNav(session.user.id);
    balance = nav.balance.balance;
    // Feedback shows only while the admin has it switched on.
    if (nav.feedbackEnabled) {
      links = [...links, { href: "/dashboard/feedback", label: t.feedback }];
    }
    // The cat is opt-in, and a student who does not have it should not see a
    // link to it at all - the page itself redirects them away regardless.
    if (nav.petEnabled) {
      links = [...links, { href: "/dashboard/pet", label: t.myCat }];
    }
  }

  // Everyone can change their own password; on a phone it is in the menu.
  const drawerLinks = [...links, { href: "/account", label: t.changePassword }];

  // The admin pages are laid out wider than the student ones, so the bar
  // matches whichever it sits above instead of ending short of the content.
  const width = isStaff ? "max-w-screen-2xl" : "max-w-4xl";

  const logOut = (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <SubmitButton
        pendingText={t.loggingOut}
        className="w-full rounded-lg border border-sky-200 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 md:w-auto md:py-1.5"
      >
        {t.logOut}
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
          links={drawerLinks}
          userName={session.user.name ?? ""}
          balance={balance}
        >
          {logOut}
        </NavDrawer>

        <Link
          href={isStaff ? "/admin" : "/dashboard"}
          className="leading-tight font-semibold text-sky-950"
        >
          {t.brand}
          <br />
          <span className="text-xs font-normal text-gray-500">
            {t.brandSub}
          </span>
        </Link>

        {/* Phone: just the points badge, so the bar stays one tidy row. */}
        {balance !== null && (
          <span className="ml-auto rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700 md:hidden">
            {balance.toLocaleString()}
            <span className="ml-1 text-xs font-normal text-sky-500">{t.pts}</span>
          </span>
        )}
        {/* Phone: the language switch sits at the right end of the bar. */}
        {!isStaff && <LanguageToggle className={`md:hidden ${balance === null ? "ml-auto" : ""}`} />}

        {/* Desktop: the full horizontal bar, unchanged. */}
        <nav className="ml-auto hidden flex-wrap items-center gap-x-4 gap-y-1 text-sm md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:underline">
              {link.label}
            </Link>
          ))}
          {balance !== null && (
            <span className="font-medium text-gray-700">
              {balance.toLocaleString()} {t.points}
            </span>
          )}
          <Link href="/account" className="text-gray-500 hover:underline" title={t.changePassword}>
            {session.user.name}
          </Link>
          {logOut}
          {!isStaff && <LanguageToggle />}
        </nav>
      </div>
    </header>
  );
}
