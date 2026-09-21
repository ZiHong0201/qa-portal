import { coatOf, type Mood } from "@/lib/pet";

/**
 * The adoptable cat, drawn on the same 100x100 grid as the existing cat
 * artwork so clothing can be positioned against known landmarks: the head sits
 * around (50, 34) with ear tips near y=6, and the neck crosses about y=52.
 *
 * Clothing is passed as item keys and drawn over the body in slot order, so a
 * hat always sits above a scarf regardless of the order they were bought.
 */

const SLOT_ORDER = ["body", "neck", "head"] as const;

/** Every drawable garment. Keys match PetItem.key in the database. */
const CLOTHING: Record<string, { slot: string; draw: (stroke: string) => React.ReactNode }> = {
  "hat-party": {
    slot: "head",
    draw: (stroke) => (
      <>
        <path d="M50 2 L62 24 L38 24 Z" fill="#f472b6" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <circle cx="50" cy="2" r="3.5" fill="#fbbf24" stroke={stroke} strokeWidth="1.5" />
        <path d="M42 18 L58 18" stroke="#fde68a" strokeWidth="2.5" strokeLinecap="round" />
      </>
    ),
  },
  "hat-cap": {
    slot: "head",
    draw: (stroke) => (
      <>
        <path d="M33 22 C 33 10 67 10 67 22 Z" fill="#2563eb" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <path d="M33 22 L22 25 L33 27 Z" fill="#1d4ed8" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <circle cx="50" cy="12" r="2.5" fill="#bfdbfe" />
      </>
    ),
  },
  "hat-crown": {
    slot: "head",
    draw: (stroke) => (
      <>
        <path d="M34 22 L34 8 L42 15 L50 5 L58 15 L66 8 L66 22 Z" fill="#fbbf24" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <circle cx="50" cy="13" r="2.5" fill="#ef4444" />
      </>
    ),
  },
  "hat-wizard": {
    slot: "head",
    draw: (stroke) => (
      <>
        <path d="M50 -2 C 56 10 62 20 66 24 L34 24 C 38 20 44 10 50 -2 Z" fill="#6d28d9" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <path d="M31 24 L69 24" stroke="#4c1d95" strokeWidth="4" strokeLinecap="round" />
        <path d="M47 14 l2 -4 l2 4 l4 2 l-4 2 l-2 4 l-2 -4 l-4 -2 Z" fill="#fde68a" />
      </>
    ),
  },
  "scarf-red": {
    slot: "neck",
    draw: (stroke) => (
      <>
        <path d="M36 50 C 44 56 56 56 64 50 L64 57 C 56 63 44 63 36 57 Z" fill="#dc2626" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <path d="M60 57 L66 74 L58 72 Z" fill="#b91c1c" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
      </>
    ),
  },
  "scarf-stripe": {
    slot: "neck",
    draw: (stroke) => (
      <>
        <path d="M36 50 C 44 56 56 56 64 50 L64 57 C 56 63 44 63 36 57 Z" fill="#0ea5e9" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <path d="M42 53 L42 60 M50 54 L50 61 M58 53 L58 60" stroke="#e0f2fe" strokeWidth="2.5" strokeLinecap="round" />
      </>
    ),
  },
  "bowtie": {
    slot: "neck",
    draw: (stroke) => (
      <>
        <path d="M50 55 L40 50 L40 60 Z" fill="#7c3aed" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M50 55 L60 50 L60 60 Z" fill="#7c3aed" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="50" cy="55" r="3" fill="#a78bfa" stroke={stroke} strokeWidth="1.5" />
      </>
    ),
  },
  "cape-hero": {
    slot: "body",
    draw: (stroke) => (
      <path d="M34 52 C 22 66 20 84 26 92 L74 92 C 80 84 78 66 66 52 C 58 58 42 58 34 52 Z" fill="#dc2626" opacity="0.92" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
    ),
  },
  "jumper-knit": {
    slot: "body",
    draw: (stroke) => (
      <>
        <path d="M32 58 C 26 72 24 84 28 90 C 35 95 65 95 72 90 C 76 84 74 72 68 58 Z" fill="#16a34a" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <path d="M30 70 L70 70 M31 78 L69 78" stroke="#bbf7d0" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
};

export function clothingKeys() {
  return Object.keys(CLOTHING);
}

export function PetCat({
  coat,
  equipped = [],
  mood,
  className,
}: {
  coat: string;
  /** PetItem keys currently worn. Unknown keys are ignored. */
  equipped?: string[];
  mood?: Mood["key"];
  className?: string;
}) {
  const { fur, ear, stroke } = coatOf(coat);

  const worn = SLOT_ORDER.flatMap((slot) =>
    equipped.filter((key) => CLOTHING[key]?.slot === slot).map((key) => ({ key, ...CLOTHING[key] }))
  );

  // A hungry or lonely cat sits still; a happy one bobs; otherwise it breathes.
  // Every one of these either has no transform or starts at scale(1), so the
  // cat is never invisible when an animation does not run - see the note on
  // cat-breathe in globals.css.
  const animation =
    mood === "happy"
      ? "animate-cat-hop"
      : mood === "sad" || mood === "hungry"
        ? ""
        : "animate-cat-breathe";

  return (
    <svg viewBox="0 0 100 100" className={`${animation} ${className ?? ""}`} role="img" aria-label="Your cat">
      {/* tail */}
      <path d="M71 84 C 90 86 97 68 89 57 C 85 51 77 53 78 61" fill="none" stroke={fur} strokeWidth="9" strokeLinecap="round" />
      <path d="M71 84 C 90 86 97 68 89 57 C 85 51 77 53 78 61" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />

      {/* body */}
      <path d="M31 50 C 24 66 19 84 26 90 C 33 96 67 96 74 90 C 81 84 76 66 69 50 Z" fill={fur} stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M50 56 C 61 61 63 79 59 92 L41 92 C 37 79 39 61 50 56 Z" fill="#ffffff" opacity="0.9" />
      <ellipse cx="39" cy="89" rx="8" ry="5" fill="#ffffff" stroke={stroke} strokeWidth="2" />
      <ellipse cx="61" cy="89" rx="8" ry="5" fill="#ffffff" stroke={stroke} strokeWidth="2" />

      {/* body-slot clothing sits over the torso but under the head */}
      {worn.filter((w) => w.slot === "body").map((w) => <g key={w.key}>{w.draw(stroke)}</g>)}

      {/* ears, drawn before the head so their bases stay hidden */}
      <path d="M32 27 L25 6 L48 19 Z" fill={fur} stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M68 27 L75 6 L52 19 Z" fill={fur} stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M34 24 L30 12 L44 20 Z" fill={ear} />
      <path d="M66 24 L70 12 L56 20 Z" fill={ear} />

      {/* neck-slot clothing, under the head so it tucks beneath the chin */}
      {worn.filter((w) => w.slot === "neck").map((w) => <g key={w.key}>{w.draw(stroke)}</g>)}

      {/* head */}
      <ellipse cx="50" cy="34" rx="22" ry="19" fill={fur} stroke={stroke} strokeWidth="2.2" />

      {/* eyes - closed and content, or open and round */}
      {mood === "happy" ? (
        <>
          <path d="M38 33 q 4 -5 8 0" fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M54 33 q 4 -5 8 0" fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="42" cy="33" rx="3.4" ry="4.2" fill={stroke} />
          <ellipse cx="58" cy="33" rx="3.4" ry="4.2" fill={stroke} />
          <circle cx="43.2" cy="31.6" r="1.2" fill="#ffffff" />
          <circle cx="59.2" cy="31.6" r="1.2" fill="#ffffff" />
        </>
      )}

      {/* nose and mouth */}
      <path d="M47 40 L53 40 L50 43.5 Z" fill={ear} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
      {mood === "sad" || mood === "hungry" ? (
        <path d="M44 49 q 6 -4 12 0" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M44 45 q 6 5 12 0" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      )}

      {/* whiskers */}
      <path d="M28 38 L40 40 M28 43 L40 43 M72 38 L60 40 M72 43 L60 43" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />

      {/* head-slot clothing last, on top of everything */}
      {worn.filter((w) => w.slot === "head").map((w) => <g key={w.key}>{w.draw(stroke)}</g>)}
    </svg>
  );
}
