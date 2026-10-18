import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { PAYMENT_SITE_NAME, portalHref } from "@/lib/fees";

export const metadata: Metadata = {
  title: PAYMENT_SITE_NAME,
  description: "Tuition fee receipts",
};

const NAV = [
  { href: "/payment", label: "Receipts" },
  { href: "/payment/receipts/new", label: "New receipt" },
  { href: "/payment/subjects", label: "Subjects" },
  { href: "/payment/prices", label: "Prices" },
];

/**
 * YH-ideal-payment: tuition fee receipts. It runs on the same app and database
 * as the exercise portal but shares nothing with it - receipts are for a typed
 * name and email, and its subjects are its own. Admin only - the proxy turns
 * everyone else away before this renders; this is the backstop.
 */
export default async function PaymentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!isAdmin(session)) redirect("/login");

  return (
    <div className="min-h-screen bg-stone-50 print:bg-white">
      <header className="border-b border-teal-900/10 bg-teal-800 text-white print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/payment" className="text-lg font-bold tracking-tight">
            {PAYMENT_SITE_NAME}
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-md px-2.5 py-1 hover:bg-teal-700">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <a href={portalHref("/admin")} className="text-teal-100 hover:text-white hover:underline">
              Exercise portal &#8599;
            </a>
            <span className="text-teal-200">{session.user.name}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="rounded-md border border-teal-500 px-2.5 py-1 hover:bg-teal-700">Log out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
