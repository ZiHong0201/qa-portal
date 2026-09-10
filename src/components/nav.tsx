import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getStudentBalance } from "@/lib/points";
import { SubmitButton } from "@/components/submit-button";

export async function Nav() {
  const session = await auth();
  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN";

  let balance: number | null = null;
  if (!isAdmin) {
    balance = (await getStudentBalance(session.user.id)).balance;
  }

  return (
    <header className="border-b border-sky-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href={isAdmin ? "/admin" : "/dashboard"} className="leading-tight font-semibold">
          YH IDEAL ACADEMY
          <br />
          <span className="text-xs font-normal text-gray-500">Exercise Portal</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {isAdmin ? (
            <>
              <Link href="/admin/sets" className="hover:underline">
                Sets
              </Link>
              <Link href="/admin/students" className="hover:underline">
                Students
              </Link>
              <Link href="/admin/catalogue" className="hover:underline">
                Catalogue
              </Link>
              <Link href="/admin/review" className="hover:underline">
                Review
              </Link>
              <Link href="/admin/master-data" className="hover:underline">
                Master Data
              </Link>
            </>
          ) : (
            <>
              <Link href="/dashboard/catalogue" className="hover:underline">
                Catalogue
              </Link>
              <span className="font-medium text-gray-700">{balance} points</span>
            </>
          )}
          <span className="text-gray-500">{session.user.name}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <SubmitButton
              pendingText="Logging out…"
              className="rounded-md border border-sky-200 px-3 py-1.5 hover:bg-sky-50"
            >
              Log out
            </SubmitButton>
          </form>
        </nav>
      </div>
    </header>
  );
}
