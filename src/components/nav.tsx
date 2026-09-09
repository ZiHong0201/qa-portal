import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getStudentBalance } from "@/lib/points";

export async function Nav() {
  const session = await auth();
  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN";

  let balance: number | null = null;
  if (!isAdmin) {
    balance = (await getStudentBalance(session.user.id)).balance;
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href={isAdmin ? "/admin" : "/dashboard"} className="leading-tight font-semibold">
          ZHAcademy
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
            <button
              type="submit"
              className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
            >
              Log out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
