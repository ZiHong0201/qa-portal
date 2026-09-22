import { resetPhase, resetWarningText } from "@/lib/reset";

/**
 * The week's notice before everything is wiped.
 *
 * Renders nothing until the warning window opens, so it costs a date
 * comparison for the rest of the year and never has to be remembered or
 * switched on by hand.
 *
 * Amber rather than red on purpose: this is a scheduled, expected event that
 * students were told about from the start, not an emergency.
 */
export function ResetWarning() {
  if (resetPhase() === "far-off") return null;

  return (
    <div className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900">
      {resetWarningText()}
    </div>
  );
}
