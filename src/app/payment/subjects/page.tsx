import { listFeeSubjects } from "@/lib/fees.server";
import { AddSubjectForm, RemoveSubjectButton } from "../subject-forms";

/**
 * The subjects a receipt can be ticked for. Kept here, apart from the exercise
 * portal's subjects - adding or removing one changes nothing on the portal.
 */
export default async function SubjectsPage() {
  const subjects = await listFeeSubjects();
  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-stone-900">Subjects</h1>
      <p className="mb-5 text-sm text-gray-600">
        The subjects you can tick on a receipt. The price depends on how many are ticked, not which. This list is
        separate from the exercise portal&apos;s subjects, and removing one here leaves receipts already made as they
        were.
      </p>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <AddSubjectForm />
      </div>

      {subjects.length === 0 ? (
        <p className="text-sm text-gray-500">No subjects yet. Add the first one above.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {subjects.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-sm font-medium text-stone-900">{s.name}</span>
              <RemoveSubjectButton id={s.id} name={s.name} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
