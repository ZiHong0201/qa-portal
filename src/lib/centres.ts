import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS } from "@/lib/cache-tags";

export type CentreOption = { id: string; name: string };

// The tuition centres, admin-managed master data (see /admin/master-data),
// for <select> options and checking a submitted id. Cached with the grades
// and subjects: the list changes about never, and the master-data actions
// drop the cached copy when it does.
export const getCentres = unstable_cache(
  async (): Promise<CentreOption[]> =>
    prisma.centre.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ["centres"],
  { tags: [CACHE_TAGS.masterData], revalidate: 3600 }
);

/** The centres a teacher may use, or all of them when `visible` is null. */
export function centresWithin(centres: CentreOption[], visible: string[] | null): CentreOption[] {
  return visible === null ? centres : centres.filter((c) => visible.includes(c.id));
}

/**
 * The centre ids ticked on a form (`name="centres"`), checked against the
 * list. An empty list is a real answer - every centre - so it is returned as
 * such; anything not on the list is an error rather than quietly dropped.
 */
export async function parseCentreIds(
  formData: FormData,
  field = "centres"
): Promise<{ centreIds: string[] } | { error: string }> {
  const ids = [...new Set(formData.getAll(field).filter((v): v is string => typeof v === "string" && v !== ""))];
  if (ids.length === 0) return { centreIds: [] };
  const valid = await prisma.centre.count({ where: { id: { in: ids } } });
  if (valid !== ids.length) return { error: "Select valid centres." };
  return { centreIds: ids };
}

/**
 * Whether something kept to `centreIds` (none: every centre) is shown to a
 * student at `studentCentreId` (null: none yet, who see only what goes to every
 * centre). As a Prisma filter for the `centres` relation of a gift or notice.
 */
export function shownAtCentre(studentCentreId: string | null) {
  return studentCentreId === null
    ? { centres: { none: {} } }
    : { OR: [{ centres: { none: {} } }, { centres: { some: { centreId: studentCentreId } } }] };
}

/** "All centres", or the names, for an admin list. */
export function centreLabel(rows: { centre: { name: string } }[]): string {
  return rows.length === 0 ? "All centres" : rows.map((r) => r.centre.name).join(", ");
}
