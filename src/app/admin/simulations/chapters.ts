import { prisma } from "@/lib/prisma";
import { compareChapters } from "@/lib/simulations";

/** Every chapter name already in the library, for the form's suggestions. */
export async function getChapterNames(): Promise<string[]> {
  const rows = await prisma.simulation.findMany({
    where: { chapter: { not: null } },
    distinct: ["chapter"],
    select: { chapter: true },
  });
  return rows
    .map((r) => r.chapter)
    .filter((c): c is string => !!c)
    .sort(compareChapters);
}
