/**
 * Food and snack artwork, drawn on a 60x60 grid and shown floating up to the
 * cat when one is given. Keys match PetItem.key, the same arrangement as the
 * clothing in pet-cat.tsx, so the admin shop can only stock treats that can
 * actually be drawn.
 */

const TREATS: Record<string, { label: string; draw: () => React.ReactNode }> = {
  "food-kibble": {
    label: "a bowl of kibble",
    draw: () => (
      <>
        {/* bowl */}
        <path d="M10 30 C 10 46 50 46 50 30 Z" fill="#60a5fa" stroke="#1e40af" strokeWidth="2" strokeLinejoin="round" />
        <ellipse cx="30" cy="30" rx="20" ry="5" fill="#93c5fd" stroke="#1e40af" strokeWidth="2" />
        {/* kibble heaped above the rim */}
        <circle cx="23" cy="27" r="4" fill="#b45309" stroke="#78350f" strokeWidth="1.4" />
        <circle cx="31" cy="24" r="4.5" fill="#d97706" stroke="#78350f" strokeWidth="1.4" />
        <circle cx="39" cy="27" r="4" fill="#b45309" stroke="#78350f" strokeWidth="1.4" />
        <circle cx="27" cy="31" r="3.5" fill="#d97706" stroke="#78350f" strokeWidth="1.4" />
        <circle cx="35" cy="31" r="3.5" fill="#b45309" stroke="#78350f" strokeWidth="1.4" />
      </>
    ),
  },
  "food-fish": {
    label: "a grilled fish",
    draw: () => (
      <>
        {/* plate */}
        <ellipse cx="30" cy="40" rx="22" ry="6" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.8" />
        {/* body */}
        <path d="M14 30 C 22 18 40 18 48 30 C 40 42 22 42 14 30 Z" fill="#fb923c" stroke="#9a3412" strokeWidth="2" strokeLinejoin="round" />
        {/* tail */}
        <path d="M14 30 L4 22 L6 30 L4 38 Z" fill="#f97316" stroke="#9a3412" strokeWidth="2" strokeLinejoin="round" />
        {/* grill marks and eye */}
        <path d="M26 24 L22 36 M34 24 L30 36" stroke="#9a3412" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        <circle cx="42" cy="28" r="1.8" fill="#7c2d12" />
      </>
    ),
  },
  "food-feast": {
    label: "a birthday feast",
    draw: () => (
      <>
        {/* cake base */}
        <path d="M12 44 L12 30 L48 30 L48 44 Z" fill="#fbcfe8" stroke="#9d174d" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 36 L48 36" stroke="#f472b6" strokeWidth="2.5" />
        {/* icing */}
        <path d="M12 30 C 18 24 24 34 30 28 C 36 34 42 24 48 30 Z" fill="#fff1f2" stroke="#9d174d" strokeWidth="2" strokeLinejoin="round" />
        {/* candle */}
        <rect x="28" y="16" width="4" height="10" fill="#38bdf8" stroke="#0369a1" strokeWidth="1.4" />
        <path d="M30 16 C 27 12 33 10 30 6 C 34 10 33 15 30 16 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1.2" />
      </>
    ),
  },
  "snack-milk": {
    label: "a saucer of milk",
    draw: () => (
      <>
        <path d="M8 32 C 8 44 52 44 52 32 Z" fill="#e5e7eb" stroke="#6b7280" strokeWidth="2" strokeLinejoin="round" />
        <ellipse cx="30" cy="32" rx="22" ry="6" fill="#f9fafb" stroke="#6b7280" strokeWidth="2" />
        <ellipse cx="30" cy="32" rx="17" ry="4" fill="#ffffff" />
        {/* a couple of drips on the rim */}
        <circle cx="18" cy="30" r="1.6" fill="#ffffff" />
        <circle cx="42" cy="31" r="1.3" fill="#ffffff" />
      </>
    ),
  },
  "snack-treat": {
    label: "some cat treats",
    draw: () => (
      <>
        {/* little fish-shaped biscuits */}
        <path d="M10 26 C 14 20 24 20 28 26 C 24 32 14 32 10 26 Z" fill="#fbbf24" stroke="#92400e" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M10 26 L4 22 L5 26 L4 30 Z" fill="#f59e0b" stroke="#92400e" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M32 36 C 36 30 46 30 50 36 C 46 42 36 42 32 36 Z" fill="#fbbf24" stroke="#92400e" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M32 36 L26 32 L27 36 L26 40 Z" fill="#f59e0b" stroke="#92400e" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="24" cy="25" r="1.2" fill="#78350f" />
        <circle cx="46" cy="35" r="1.2" fill="#78350f" />
      </>
    ),
  },
  "snack-catnip": {
    label: "a pinch of catnip",
    draw: () => (
      <>
        {/* leaves */}
        <path d="M30 44 L30 24" stroke="#166534" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M30 30 C 20 26 16 16 22 12 C 30 14 32 24 30 30 Z" fill="#4ade80" stroke="#166534" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M30 34 C 40 30 44 20 38 16 C 30 18 28 28 30 34 Z" fill="#22c55e" stroke="#166534" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M30 42 C 22 40 18 34 22 30 C 28 31 31 38 30 42 Z" fill="#86efac" stroke="#166534" strokeWidth="1.8" strokeLinejoin="round" />
      </>
    ),
  },
};

/** A plain bowl, so a treat with unrecognised artwork still shows something. */
function fallback() {
  return (
    <>
      <path d="M10 30 C 10 46 50 46 50 30 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx="30" cy="30" rx="20" ry="5" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
    </>
  );
}

export function treatKeys() {
  return Object.keys(TREATS);
}

export function treatLabel(key: string) {
  return TREATS[key]?.label ?? "a treat";
}

export function PetTreat({ treatKey, className }: { treatKey: string; className?: string }) {
  const treat = TREATS[treatKey];
  return (
    <svg viewBox="0 0 60 60" className={className} aria-hidden="true">
      {treat ? treat.draw() : fallback()}
    </svg>
  );
}
