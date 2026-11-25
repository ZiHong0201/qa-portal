// What a page shows the instant a link to it is clicked, while the server is
// still building it. Without one the old page just sat there until the new
// one was ready, so a click looked like it had done nothing.
//
// Used by every loading.tsx under /dashboard, /admin, /payment and /account.
// It sits inside the section's layout, so the nav bar stays put and only the
// page body is swapped for these grey placeholders. Deliberately generic: a
// heading, a line of text and a few cards fits most pages closely enough that
// the real one does not jump about when it arrives.
export function PageLoading() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Loading…</span>
      <div className="mb-3 h-4 w-24 rounded bg-gray-200" />
      <div className="mb-6 h-8 w-56 max-w-full rounded-md bg-gray-200" />
      <div className="mb-8 h-4 w-80 max-w-full rounded bg-gray-200" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 h-5 w-1/3 rounded bg-gray-200" />
            <div className="mb-2 h-3 w-full rounded bg-gray-100" />
            <div className="h-3 w-2/3 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
