import Link from "next/link";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function AdminHome() {
  // Teachers share this page. They see the same teaching figures and lose the
  // two cards that link into admin-only sections - a card that bounces you
  // back to the page you clicked it from is worse than no card.
  const admin = isAdmin(await auth());

  const now = new Date();
  // Switched on and inside its window - the same test the ticker and pop-ups
  // use, so this count matches what students are actually seeing.
  const liveWindow = {
    isActive: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  };

  const [
    studentCount,
    setCount,
    questionCount,
    pendingCount,
    catalogueCount,
    liveNoticeCount,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.questionSet.count(),
    prisma.question.count(),
    prisma.submission.count({ where: { status: "PENDING" } }),
    prisma.catalogueItem.count(),
    Promise.all([
      prisma.announcement.count({ where: liveWindow }),
      prisma.popupAd.count({ where: liveWindow }),
    ]).then(([a, p]) => a + p),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Admin overview</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Link href="/admin/students">
          <StatCard label="Students" value={studentCount} />
        </Link>
        <StatCard label="Question sets" value={setCount} />
        <StatCard label="Questions" value={questionCount} />
        <Link href="/admin/review">
          <StatCard
            label="Pending reviews"
            value={pendingCount}
            highlight={pendingCount > 0}
          />
        </Link>
        {admin && (
          <>
            <Link href="/admin/catalogue">
              <StatCard label="Catalogue items" value={catalogueCount} />
            </Link>
            <Link href="/admin/announcements">
              <StatCard label="Live notices" value={liveNoticeCount} />
            </Link>
          </>
        )}
      </div>
      <div className="mt-8 flex flex-wrap gap-2">
        <Link
          href="/admin/sets/new"
          className="rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
        >
          + New question set
        </Link>
        <Link
          href="/admin/students/new"
          className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
        >
          + New student
        </Link>
        {admin && (
          <Link
            href="/admin/catalogue/new"
            className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
          >
            + New catalogue item
          </Link>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`h-full rounded-2xl border p-4 ${
        highlight ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"
      }`}
    >
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 text-2xl font-bold text-sky-900">{value}</p>
    </div>
  );
}
