import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getGradeNames } from "@/lib/grades";
import { getSubjectNames } from "@/lib/subjects";
import { RequestRow } from "./request-row";
import { getCentres, centresWithin } from "@/lib/centres";
import { currentVisibleCentreIds } from "@/lib/permissions";

const asked = (d: Date) =>
  d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  });

/** Account requests from the login page, oldest first. */
export default async function AccountRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ approved?: string }>;
}) {
  const { approved } = await searchParams;
  // A teacher sees the requests naming one of their centres; everything else
  // waits for an admin, who sees them all.
  const visible = await currentVisibleCentreIds();
  const [requests, grades, subjects, allCentres] = await Promise.all([
    prisma.accountRequest.findMany({
      where: visible === null ? {} : { centreId: { in: visible } },
      orderBy: { createdAt: "asc" },
    }),
    getGradeNames(),
    getSubjectNames(),
    getCentres(),
  ]);
  const centres = centresWithin(allCentres, visible);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Account requests</h1>
        <Link href="/admin/students" className="text-sm text-blue-600 hover:underline">
          Back to students
        </Link>
      </div>
      {approved && (
        <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Student account created. Their password and a link to the portal have been emailed to them.
          <br />
          <b>Tell the student to check their Spam folder</b> if the email is not in their inbox, and to mark it
          &ldquo;Not spam&rdquo; - that teaches their mail to let the next one through.
        </p>
      )}
      <p className="mb-4 text-sm text-gray-600">
        Approving makes a student account with a random password and emails it to the student, with a link to the
        portal and a reminder to change the password once they log in.
      </p>

      {grades.length === 0 || subjects.length === 0 ? (
        <p className="rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          Add at least one grade and one subject in{" "}
          <Link href="/admin/master-data" className="underline">
            Master Data
          </Link>{" "}
          before approving requests.
        </p>
      ) : requests.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">No requests waiting.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <RequestRow
              key={r.id}
              request={{ id: r.id, name: r.name, email: r.email, createdAt: asked(r.createdAt), centreId: r.centreId }}
              grades={grades}
              subjects={subjects}
              centres={centres}
              allowNoCentre={visible === null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
