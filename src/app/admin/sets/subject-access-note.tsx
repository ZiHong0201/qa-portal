/**
 * Tells a teacher which subjects they can change, so a set shown read-only is
 * explained rather than looking broken. Admins edit everything and see nothing.
 */
export function SubjectAccessNote({ editable }: { editable: string[] | null }) {
  if (editable === null) return null;
  if (editable.length === 0) {
    return (
      <p className="mb-4 max-w-2xl rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
        You have not been given any subjects yet, so every question set here is read-only. Ask
        the admin to add your subjects to your account.
      </p>
    );
  }
  return (
    <p className="mb-4 max-w-2xl text-sm text-gray-600">
      You can change sets in {editable.join(", ")}. Sets in other subjects are read-only - ask the
      admin if you need another subject added.
    </p>
  );
}
