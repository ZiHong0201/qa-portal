import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { canEditSubject, currentEditableSubjects } from "@/lib/permissions";
import { deleteSimulation, toggleSimulationActive } from "@/lib/actions/simulations";
import { groupByChapter, phetThumbnail } from "@/lib/simulations";
import { SubmitButton } from "@/components/submit-button";
import { SimThumbnail } from "@/components/sim-thumbnail";
import { SubjectAccessNote } from "../sets/subject-access-note";

export default async function AdminSimulationsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const { subject: subjectFilter } = await searchParams;
  const [simulations, editable] = await Promise.all([
    prisma.simulation.findMany({
      orderBy: [{ topicCode: "asc" }, { title: "asc" }],
      include: { grades: true },
    }),
    currentEditableSubjects(),
  ]);

  const subjects = Array.from(new Set(simulations.map((s) => s.subject))).sort();
  // A stale ?subject= shows the first subject rather than an empty page.
  const active =
    subjectFilter && subjects.includes(subjectFilter) ? subjectFilter : (subjects[0] ?? null);
  const shown = simulations.filter((s) => s.subject === active);
  const canEdit = active !== null && canEditSubject(editable, active);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Simulations</h1>
        {(editable === null || editable.length > 0) && (
          <Link
            href="/admin/simulations/new"
            className="rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
          >
            + New simulation
          </Link>
        )}
      </div>
      <SubjectAccessNote editable={editable} />
      <p className="mb-4 max-w-2xl text-sm text-gray-600">
        Interactive experiments students open from Simulations in their menu, grouped by chapter.
        Each one is shown to the grades and subject it is tagged with.
      </p>

      {simulations.length === 0 ? (
        <p className="text-gray-500">No simulations yet.</p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {subjects.map((name) => (
              <Link
                key={name}
                href={`/admin/simulations?subject=${encodeURIComponent(name)}`}
                className={`rounded-full border px-3 py-1 text-sm font-medium ${
                  name === active
                    ? "border-sky-300 bg-sky-100 text-sky-800"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {name} ({simulations.filter((s) => s.subject === name).length})
              </Link>
            ))}
          </div>
          {!canEdit && (
            <p className="mb-4 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
              Read-only: {active} is not one of your subjects.
            </p>
          )}

          <div className="flex flex-col gap-6">
            {groupByChapter(shown).map(({ chapter, items }) => (
              <section key={chapter ?? ""}>
                <h2 className="mb-2 font-semibold text-gray-700">{chapter ?? "No chapter"}</h2>
                <ul className="flex flex-col gap-2">
                  {items.map((sim) => {
                    const thumb = phetThumbnail(sim.url);
                    return (
                      <li
                        key={sim.id}
                        className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                      >
                        <span className="relative flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-200 bg-gray-50 text-xl">
                          🧪
                          {thumb && (
                            <SimThumbnail
                              src={thumb}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <a
                            href={sim.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium hover:underline"
                          >
                            {sim.title}
                          </a>
                          <p className="text-sm text-gray-500">
                            {sim.topicCode && <>{sim.topicCode} · </>}
                            {sim.grades.map((g) => g.grade).join(", ") || "No grades"} ·{" "}
                            {sim.urlMs ? "English + BM" : "English only"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-sm">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              sim.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {sim.isActive ? "Active" : "Hidden"}
                          </span>
                          {canEdit && (
                            <>
                              <Link
                                href={`/admin/simulations/${sim.id}/edit`}
                                className="text-blue-600 hover:underline"
                              >
                                Edit
                              </Link>
                              <form action={toggleSimulationActive.bind(null, sim.id, !sim.isActive)}>
                                <SubmitButton pendingText="..." className="text-blue-600 hover:underline">
                                  {sim.isActive ? "Hide" : "Show"}
                                </SubmitButton>
                              </form>
                              <form action={deleteSimulation.bind(null, sim.id)}>
                                <SubmitButton
                                  pendingText="Deleting…"
                                  className="text-red-600 hover:underline"
                                >
                                  Delete
                                </SubmitButton>
                              </form>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
