/**
 * Whether a student may see - and so answer - a question set: it is active,
 * shared with their grade, and in one of their subjects.
 *
 * The sets list filters by the same three conditions in its query. This is the
 * same rule for a set already in hand, kept in one place because it guards two
 * things that must agree: the set page (what a student can read) and the
 * answer action (what earns them points). Checked only on the page, a student
 * could still post answers to a hidden or switched-off set and be paid for
 * them, and be told the correct answer while at it.
 */
export function studentCanSeeSet(
  set: { isActive: boolean; subject: string; grades: { grade: string }[] },
  student: { grade: string | null; subjects: { subject: string }[] } | null
): boolean {
  if (!set.isActive || !student?.grade) return false;
  const grade = student.grade;
  return (
    set.grades.some((g) => g.grade === grade) &&
    student.subjects.some((s) => s.subject === set.subject)
  );
}
