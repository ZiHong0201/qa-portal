/**
 * The pure half of the subject check in src/lib/permissions.ts, kept apart so
 * client components can decide which controls to show without importing the
 * auth and database code that file needs.
 *
 * `editable` is the list editableSubjects() returns: null for every subject.
 */
export function canEditSubject(editable: string[] | null, subject: string): boolean {
  return editable === null || editable.includes(subject);
}
