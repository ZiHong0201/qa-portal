// Single source of truth for the notice, so the signed-in strip and the
// signed-out line can never drift apart.
export const DEV_DISCLAIMER =
  "This site is still under development, all data will be cleared on 1 January 2027";

/**
 * The strip shown under the nav bar on every signed-in page. Rendered in
 * <Nav>, so the dashboard and admin layouts both pick it up without edits.
 */
export function DevDisclaimerBar() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900">
      {DEV_DISCLAIMER}
    </div>
  );
}

/**
 * The signed-out variant. The landing and login pages are pinned to exactly
 * one viewport (h-dvh + overflow-hidden), so this is positioned absolutely
 * against their `relative` <main> - taking it out of flow means it cannot
 * push the centred content down and off the bottom of a short screen.
 */
export function DevDisclaimerNote() {
  return (
    <p className="absolute inset-x-0 bottom-0 z-10 px-4 pb-3 text-center text-[11px] leading-snug text-slate-500 short:pb-1">
      {DEV_DISCLAIMER}
    </p>
  );
}
