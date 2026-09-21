"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type NavLink = { href: string; label: string };

/** One small glyph per destination, so the drawer scans as a menu. */
function LinkIcon({ label }: { label: string }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 18,
    height: 18,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (label) {
    case "Home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 10v10h14V10" />
        </svg>
      );
    case "My Sets":
    case "Sets":
      return (
        <svg {...common}>
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v16H5.5A1.5 1.5 0 0 1 4 18.5Z" />
          <path d="M8 4v16" />
        </svg>
      );
    case "Catalogue":
      return (
        <svg {...common}>
          <path d="M3 8h18v12H3z" />
          <path d="M3 8l2-4h14l2 4M12 8v12" />
        </svg>
      );
    case "Scoreboard":
      return (
        <svg {...common}>
          <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
          <path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3" />
          <path d="M12 13v4M9 20h6" />
        </svg>
      );
    case "Students":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <path d="M16 6.5a3 3 0 0 1 0 5.5M17.5 19a5 5 0 0 0-2-4" />
        </svg>
      );
    case "Review":
      return (
        <svg {...common}>
          <path d="M4 5h16v11H8l-4 4z" />
          <path d="M9 10.5l2 2 4-4" />
        </svg>
      );
    case "Announcements":
      return (
        <svg {...common}>
          <path d="M3 11v2a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1Z" />
          <path d="M7 14v3a2 2 0 0 0 4 0v-1" />
          <path d="M17 9a4 4 0 0 1 0 6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2.5" />
        </svg>
      );
  }
}

/**
 * The mobile navigation: a hamburger in the top bar and a drawer that slides
 * in from the left.
 *
 * The top bar previously wrapped every link onto two or three cramped rows on
 * a phone. Those links move in here, and the bar keeps only the logo, the
 * points badge and this button.
 *
 * The log-out form is passed in as children because it is a server action -
 * it has to be rendered on the server and handed down, not rebuilt here.
 */
export function NavDrawer({
  links,
  userName,
  balance,
  children,
}: {
  links: NavLink[];
  userName: string;
  balance: number | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on navigation. Compared during render rather than in an effect:
  // the drawer lives in the layout, so it survives the route change and would
  // otherwise stay open over the new page.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    // Stop the page behind the drawer scrolling under it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="-ml-1 rounded-lg p-2 text-sky-800 hover:bg-sky-50 active:scale-95 md:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          width={22}
          height={22}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="animate-fade-in absolute inset-0 cursor-default bg-slate-900/40"
          />

          <div className="animate-drawer-in absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-sky-600 to-indigo-600 px-5 pt-5 pb-4 text-white">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/icon-192.png"
                    alt=""
                    className="h-11 w-11 rounded-xl ring-2 ring-white/40"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{userName}</p>
                    <p className="text-xs text-sky-100">
                      Mr Tan Exercise Portal
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="-mt-1 -mr-2 rounded-lg p-2 text-white/80 hover:bg-white/10"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width={18}
                    height={18}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              {balance !== null && (
                <p className="mt-4 inline-flex items-baseline gap-1 rounded-full bg-white/15 px-3 py-1 text-sm ring-1 ring-white/25">
                  <span className="font-bold">{balance.toLocaleString()}</span>
                  <span className="text-xs text-sky-100">points</span>
                </p>
              )}
            </div>

            <nav className="flex-1 overflow-y-auto p-3">
              {links.map((link) => {
                const active =
                  pathname === link.href ||
                  (link.href !== "/dashboard" &&
                    link.href !== "/admin" &&
                    pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors ${
                      active
                        ? "bg-sky-50 text-sky-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={active ? "text-sky-600" : "text-slate-400"}
                    >
                      <LinkIcon label={link.label} />
                    </span>
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-slate-100 p-3">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
