import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS } from "@/lib/cache-tags";

// Grades are admin-managed master data (see /admin/master-data), not a
// fixed list - this reads the current set for use in <select> options and
// server-side validation.
//
// Kept in the data cache: the list changes a few times a year, and the
// master-data actions drop the cached copy whenever it does.
export const getGradeNames = unstable_cache(
  async (): Promise<string[]> => {
    const grades = await prisma.grade.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });
    return grades.map((g) => g.name);
  },
  ["grade-names"],
  { tags: [CACHE_TAGS.masterData], revalidate: 3600 }
);
