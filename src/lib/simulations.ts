// The simulation library's plain helpers: PhET addresses and the chapter
// order. Kept free of server-only imports so the admin form can use them too.

const PHET_BASE = "https://phet.colorado.edu/sims/html";

/** The English build of a PhET sim. */
export function phetUrl(slug: string): string {
  return `${PHET_BASE}/${slug}/latest/${slug}_en.html`;
}

/**
 * The Malay build. Only exists once a sim has been translated - every one in
 * PHET_PRESETS has been. For a sim that has not, the all-languages file with
 * `?locale=ms` loads instead and shows English wherever Malay is missing.
 */
export function phetUrlMs(slug: string): string {
  return `${PHET_BASE}/${slug}/latest/${slug}_ms.html`;
}

const PHET_SLUG = /^https:\/\/phet\.colorado\.edu\/sims\/html\/([a-z0-9-]+)\//;

/** The PhET screenshot for a sim's address, or null for anything not PhET. */
export function phetThumbnail(url: string): string | null {
  const slug = url.match(PHET_SLUG)?.[1];
  return slug ? `${PHET_BASE}/${slug}/latest/${slug}-600.png` : null;
}

/**
 * PhET sims that fit the KSSM syllabus, offered in the admin form so a
 * teacher picks one by name instead of hunting for its address. Any other
 * https:// simulation can still be typed in by hand.
 */
export const PHET_PRESETS: { slug: string; title: string }[] = [
  // Matter, heat and pressure
  { slug: "states-of-matter-basics", title: "States of Matter: Basics" },
  { slug: "states-of-matter", title: "States of Matter" },
  { slug: "gas-properties", title: "Gas Properties" },
  { slug: "gases-intro", title: "Gases Intro" },
  { slug: "diffusion", title: "Diffusion" },
  { slug: "density", title: "Density" },
  { slug: "buoyancy", title: "Buoyancy" },
  { slug: "under-pressure", title: "Under Pressure" },
  { slug: "energy-forms-and-changes", title: "Energy Forms and Changes" },
  { slug: "greenhouse-effect", title: "The Greenhouse Effect" },
  // Chemistry
  { slug: "build-an-atom", title: "Build an Atom" },
  { slug: "isotopes-and-atomic-mass", title: "Isotopes and Atomic Mass" },
  { slug: "molecule-shapes", title: "Molecule Shapes" },
  { slug: "balancing-chemical-equations", title: "Balancing Chemical Equations" },
  { slug: "reactants-products-and-leftovers", title: "Reactants, Products and Leftovers" },
  { slug: "concentration", title: "Concentration" },
  { slug: "molarity", title: "Molarity" },
  { slug: "acid-base-solutions", title: "Acid-Base Solutions" },
  { slug: "ph-scale", title: "pH Scale" },
  // Forces and motion
  { slug: "forces-and-motion-basics", title: "Forces and Motion: Basics" },
  { slug: "friction", title: "Friction" },
  { slug: "projectile-motion", title: "Projectile Motion" },
  { slug: "masses-and-springs", title: "Masses and Springs" },
  { slug: "hookes-law", title: "Hooke's Law" },
  { slug: "energy-skate-park-basics", title: "Energy Skate Park: Basics" },
  { slug: "gravity-and-orbits", title: "Gravity and Orbits" },
  // Electricity and magnetism
  { slug: "balloons-and-static-electricity", title: "Balloons and Static Electricity" },
  { slug: "john-travoltage", title: "John Travoltage" },
  { slug: "circuit-construction-kit-dc", title: "Circuit Construction Kit: DC" },
  { slug: "ohms-law", title: "Ohm's Law" },
  { slug: "faradays-law", title: "Faraday's Law" },
  // Light and waves
  { slug: "bending-light", title: "Bending Light" },
  { slug: "geometric-optics", title: "Geometric Optics" },
  { slug: "color-vision", title: "Color Vision" },
  { slug: "waves-intro", title: "Waves Intro" },
  { slug: "wave-on-a-string", title: "Wave on a String" },
  // Biology
  { slug: "natural-selection", title: "Natural Selection" },
  { slug: "gene-expression-essentials", title: "Gene Expression Essentials" },
  { slug: "neuron", title: "Neuron" },
  // Mathematics
  { slug: "fractions-intro", title: "Fractions Intro" },
  { slug: "equality-explorer", title: "Equality Explorer" },
  { slug: "area-builder", title: "Area Builder" },
  { slug: "graphing-lines", title: "Graphing Lines" },
  { slug: "graphing-quadratics", title: "Graphing Quadratics" },
  { slug: "trig-tour", title: "Trig Tour" },
  { slug: "plinko-probability", title: "Plinko Probability" },
];

/**
 * Chapters in reading order: "Chapter 2" before "Chapter 10", and anything
 * without a chapter (null) last.
 */
export function compareChapters(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/** Groups by chapter, keeping each group in the order it was given. */
export function groupByChapter<T extends { chapter: string | null }>(
  items: T[]
): { chapter: string | null; items: T[] }[] {
  const groups = new Map<string | null, T[]>();
  for (const item of items) {
    const key = item.chapter?.trim() || null;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return Array.from(groups, ([chapter, items]) => ({ chapter, items })).sort((a, b) =>
    compareChapters(a.chapter, b.chapter)
  );
}
