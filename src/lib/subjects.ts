import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS } from "@/lib/cache-tags";

// Subjects are admin-managed master data (see /admin/master-data), not a
// fixed list - this reads the current set for use in <select> options and
// server-side validation.
//
// Kept in the data cache: the list changes a few times a year, and the
// master-data actions drop the cached copy whenever it does.
export const getSubjectNames = unstable_cache(
  async (): Promise<string[]> => {
    const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
    return subjects.map((s) => s.name);
  },
  ["subject-names"],
  { tags: [CACHE_TAGS.masterData], revalidate: 3600 }
);
