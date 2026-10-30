import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUiLang } from "@/lib/i18n.server";
import { studentSimulationScope } from "@/lib/simulations.server";
import { simulationsText } from "@/lib/text/simulations";
import { SimulationPlayer } from "./simulation-player";

export default async function StudentSimulationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const t = simulationsText[await getUiLang()];

  const scope = await studentSimulationScope(session!.user.id);
  if (!scope) notFound();

  // Looked up within the student's scope, so a link to another grade's or a
  // hidden simulation is simply not found.
  const simulation = await prisma.simulation.findFirst({ where: { id, ...scope.where } });
  if (!simulation) notFound();

  // The rest of the chapter, or of the subject when it has no chapter, so the
  // student can move on without going back to the list.
  const more = await prisma.simulation.findMany({
    where: {
      ...scope.where,
      subject: simulation.subject,
      chapter: simulation.chapter,
      id: { not: simulation.id },
    },
    orderBy: [{ topicCode: "asc" }, { title: "asc" }],
    select: { id: true, title: true, topicCode: true },
    take: 8,
  });

  return (
    <div>
      <Link
        href={`/dashboard/simulations?subject=${encodeURIComponent(simulation.subject)}`}
        className="text-sm font-medium text-sky-600 hover:text-sky-800 hover:underline"
      >
        &larr; {t.allSubjectSims(simulation.subject)}
      </Link>
      <p className="mt-2 text-xs font-semibold tracking-wide text-sky-500 uppercase">
        {[simulation.subject, simulation.chapter, simulation.topicCode && t.topic(simulation.topicCode)]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <h1 className="mb-1 text-2xl font-bold text-sky-950">{simulation.title}</h1>
      {simulation.description && (
        <p className="mb-4 whitespace-pre-line text-sky-700/80">{simulation.description}</p>
      )}

      <SimulationPlayer
        title={simulation.title}
        url={simulation.url}
        urlMs={simulation.urlMs}
        prefersMalay={scope.prefersMalay}
      />

      {more.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 font-semibold text-sky-950">
            {simulation.chapter ? t.moreInChapter(simulation.chapter) : t.moreSims}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {more.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/dashboard/simulations/${m.id}`}
                  className="block rounded-full border border-sky-200 bg-white px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-50"
                >
                  {m.topicCode && <span className="text-gray-500">{m.topicCode} · </span>}
                  {m.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
