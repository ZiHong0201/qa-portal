"use client";

import { useState } from "react";
import type { CentreOption } from "@/lib/centres";

/**
 * Which centres a gift, a notice or a pop-up is for, as `name="centres"`
 * checkboxes. None ticked means every centre, which is also how everything
 * made before centres existed behaves. Not shown at all until a centre exists.
 *
 * Held in state, like the other fields on these forms: React resets a form
 * once its action returns, and a refused save should not untick everything.
 */
export function CentreCheckboxes({
  centres,
  selected = [],
  what,
}: {
  centres: CentreOption[];
  selected?: string[];
  /** "gift", "notice" - for the help line. */
  what: string;
}) {
  const [ticked, setTicked] = useState<string[]>(selected);
  if (centres.length === 0) return null;
  const toggle = (id: string) =>
    setTicked((now) => (now.includes(id) ? now.filter((x) => x !== id) : [...now, id]));
  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-medium">Centres</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {centres.map((c) => (
          <label key={c.id} className="flex items-center gap-1 text-sm whitespace-nowrap">
            <input
              type="checkbox"
              name="centres"
              value={c.id}
              checked={ticked.includes(c.id)}
              onChange={() => toggle(c.id)}
            />
            {c.name}
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {ticked.length === 0
          ? `Shown at every centre. Tick centres to keep this ${what} to them.`
          : `Shown at the ticked centres only.`}{" "}
        Students with no centre yet see only what goes to every centre.
      </p>
    </fieldset>
  );
}
