import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getGradeNames } from "@/lib/grades";
import { getSubjectNames } from "@/lib/subjects";
import { RequestRow } from "./request-row";

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
  const [requests, grades, subjects] = await Promise.all([
    prisma.accountRequest.findMany({ orderBy: { createdAt: "asc" } }),
    getGradeNames(),
    getSubjectNames(),
  ]);

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
              request={{ id: r.id, name: r.name, email: r.email, createdAt: asked(r.createdAt) }}
              grades={grades}
              subjects={subjects}
            />
          ))}
        </div>
      )}
    </div>
  );
}
