import { prisma } from "@/lib/prisma";
import { SubjectFeeForm } from "../forms";

export default async function FeesPage() {
  const [subjects, enrolled] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { name: true, monthlyFeeSen: true } }),
    prisma.studentSubject.groupBy({ by: ["subject"], _count: { _all: true } }),
  ]);
  const count = new Map(enrolled.map((e) => [e.subject, e._count._all]));

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-stone-900">Fees</h1>
      <p className="mb-5 text-sm text-gray-600">
        The usual monthly fee for each subject. A student is billed for each subject they are enrolled in on
        the portal. A student who pays a different amount, such as a sibling discount, gets their own rate on
        their page. Changing a fee here affects bills made from now on; bills already made keep the amount
        they were made with.
      </p>
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {subjects.map((s) => (
          <li key={s.name} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium text-stone-900">{s.name}</p>
              <p className="text-xs text-gray-500">{count.get(s.name) ?? 0} student(s) enrolled</p>
            </div>
            <SubjectFeeForm subject={s.name} feeSen={s.monthlyFeeSen} />
          </li>
        ))}
      </ul>
    </div>
  );
}
