import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { StaffRowActions } from "./staff-row-actions";

export default async function AdminStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; saved?: string }>;
}) {
  const [{ created, saved }, session, staff] = await Promise.all([
    searchParams,
    auth(),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "TEACHER"] } },
      // Admins first, then newest teachers: the list is read to answer "who
      // can do what here", and the answer starts with who can do everything.
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
  ]);

  const admins = staff.filter((s) => s.role === "ADMIN");
  const teachers = staff.filter((s) => s.role === "TEACHER");

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff</h1>
        <Link
          href="/admin/staff/new"
          className="rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
        >
          + New staff account
        </Link>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-gray-600">
        Teachers write and mark question sets, manage students and their points, and see
        integrity signals. Admins do all of that, and also hold the catalogue, announcements, the
        virtual cat, master data, these staff accounts, and the portal reset.
      </p>

      {created && (
        <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Account created. Pass them the password yourself.
        </p>
      )}
      {saved && (
        <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Changes saved.
        </p>
      )}

      {admins.length === 1 && (
        <p className="mb-4 max-w-2xl rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          There is only one admin account. If its password is lost there is no way back in through
          the portal, so it is worth creating a second one.
        </p>
      )}

      <StaffList
        title="Admins"
        people={admins}
        currentUserId={session?.user.id}
        empty="No admin accounts."
      />
      <div className="mt-8">
        <StaffList
          title="Teachers"
          people={teachers}
          currentUserId={session?.user.id}
          empty="No teacher accounts yet. Everything is being run from the admin accounts above."
        />
      </div>
    </div>
  );
}

function StaffList({
  title,
  people,
  currentUserId,
  empty,
}: {
  title: string;
  people: { id: string; name: string; email: string; createdAt: Date }[];
  currentUserId?: string;
  empty: string;
}) {
  return (
    <div>
      <h2 className="mb-2 font-medium text-sky-950">
        {title}
        <span className="ml-2 text-sm font-normal text-gray-400">{people.length}</span>
      </h2>
      {people.length === 0 ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
          {people.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sky-950">
                  {p.name}
                  {p.id === currentUserId && (
                    <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-normal text-sky-700">
                      you
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-gray-500">{p.email}</p>
              </div>
              <span className="text-xs text-gray-400">
                since{" "}
                {p.createdAt.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <StaffRowActions staffId={p.id} name={p.name} isSelf={p.id === currentUserId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
