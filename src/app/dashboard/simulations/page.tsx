import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SubjectArt, themeFor } from "@/components/subject-art";
import { getUiLang } from "@/lib/i18n.server";
import { groupByChapter, phetThumbnail } from "@/lib/simulations";
import { studentSimulationScope } from "@/lib/simulations.server";
import { simulationsText } from "@/lib/text/simulations";
import { SimThumbnail } from "@/components/sim-thumbnail";

export default async function StudentSimulationsPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const { subject: subjectFilter } = await searchParams;
  const session = await auth();
  const t = simulationsText[await getUiLang()];

  const scope = await studentSimulationScope(session!.user.id);
  if (!scope) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">{t.simulations}</h1>
        <p className="text-gray-500">{t.notSetUp}</p>
      </div>
    );
  }

  // An unknown or unenrolled ?subject= falls back to everything, as on the
  // sets page.
  const activeSubject =
    subjectFilter && scope.subjects.includes(subjectFilter) ? subjectFilter : null;

  const simulations = await prisma.simulation.findMany({
    where: { ...scope.where, ...(activeSubject ? { subject: activeSubject } : {}) },
    orderBy: [{ topicCode: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      subject: true,
      chapter: true,
      topicCode: true,
      url: true,
      urlMs: true,
    },
  });

  // With more than one subject on screen each subject gets its own heading,
  // so "Chapter 1" of Science and of Maths are not run together.
  const subjectsShown = activeSubject
    ? [activeSubject]
    : scope.subjects.filter((s) => simulations.some((sim) => sim.subject === s));

  return (
    <div>
      <Link
        href="/dashboard"
        className="text-sm font-medium text-sky-600 hover:text-sky-800 hover:underline"
      >
        &larr; {t.backHome}
      </Link>
      <h1 className="mt-2 mb-1 text-2xl font-bold text-sky-950">
        {activeSubject ?? t.simulations}
      </h1>
      <p className="mb-1 text-sm text-gray-500">
        {scope.grade} · {activeSubject ?? t.joinSubjects(scope.subjects)}
      </p>
      <p className="mb-4 text-sm text-gray-600">{t.intro}</p>

      {scope.subjects.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href="/dashboard/simulations"
            className={`rounded-full border px-3 py-1 text-sm font-medium ${
              activeSubject
                ? "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                : "border-sky-300 bg-sky-100 text-sky-800"
            }`}
          >
            {t.all}
          </Link>
          {scope.subjects.map((name) => {
            const theme = themeFor(name);
            return (
              <Link
                key={name}
                href={`/dashboard/simulations?subject=${encodeURIComponent(name)}`}
                className={`rounded-full border px-3 py-1 text-sm font-medium ${
                  activeSubject === name
                    ? `border-transparent ${theme.band} ${theme.text}`
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {name}
              </Link>
            );
          })}
        </div>
      )}

      {simulations.length === 0 ? (
        <p className="text-gray-500">
          {t.noSims(scope.grade, activeSubject ?? t.joinSubjects(scope.subjects))}
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {subjectsShown.map((subject) => {
            const theme = themeFor(subject);
            const inSubject = simulations.filter((s) => s.subject === subject);
            return (
              <section key={subject}>
                {!activeSubject && (
                  <h2 className={`mb-3 text-lg font-bold ${theme.text}`}>
                    {subject}{" "}
                    <span className="text-sm font-normal text-gray-500">
                      · {t.simCount(inSubject.length)}
                    </span>
                  </h2>
                )}
                <div className="flex flex-col gap-6">
                  {groupByChapter(inSubject).map(({ chapter, items }) => (
                    <div key={chapter ?? ""}>
                      <h3 className="mb-2 font-semibold text-sky-950">
                        {chapter ?? t.otherTopics}
                      </h3>
                      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((sim) => {
                          const thumb = phetThumbnail(sim.url);
                          return (
                            <li key={sim.id}>
                              <Link
                                href={`/dashboard/simulations/${sim.id}`}
                                className={`subject-tile group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:-translate-y-1 focus-visible:shadow-lg ${theme.ring}`}
                              >
                                <div className={`relative aspect-video ${theme.band}`}>
                                  <div className="h-full p-3">
                                    <SubjectArt subject={subject} />
                                  </div>
                                  {/* Over the drawing, which shows again if the
                                    screenshot fails to load. */}
                                  {thumb && (
                                    <SimThumbnail
                                      src={thumb}
                                      className="absolute inset-0 h-full w-full object-cover"
                                    />
                                  )}
                                </div>
                                <div className="flex flex-1 flex-col gap-1 p-4">
                                  <p className="font-bold text-sky-950">{sim.title}</p>
                                  {sim.description && (
                                    <p className="line-clamp-2 text-sm text-gray-600">
                                      {sim.description}
                                    </p>
                                  )}
                                  <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2 text-xs">
                                    {sim.topicCode && (
                                      <span className="text-gray-500">{t.topic(sim.topicCode)}</span>
                                    )}
                                    <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-600">
                                      EN
                                    </span>
                                    {sim.urlMs && (
                                      <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-600">
                                        BM
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
