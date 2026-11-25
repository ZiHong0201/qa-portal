import type { Element, Mood, PetLook, Stage } from "@/lib/study-pet";

/**
 * The study pet, drawn in code.
 *
 * One body for every element: the element only changes the colours and what
 * sits on the pet's head, which is what keeps five pets looking like one
 * family. Plain JSX with no hooks and no SVG ids, so it renders on the server
 * or the client and any number of copies can share a page.
 *
 * Every shape is a flat fill. Glows are a wide translucent stroke under a thin
 * bright one rather than an SVG blur, and the only animation is moving or
 * fading whole groups - all of which the browser does cheaply, which matters
 * because a copy of this sits in the corner of every student page.
 */

type Palette = {
  dark: string; // base shade and outline-adjacent fill
  mid: string;
  light: string;
  line: string; // outlines
  glow: string; // the wide, soft half of a glowing line
  glowCore: string; // the thin, bright half
  iris: string;
  pupil: string;
  accent: string; // moss, droplets, flames, sparks, moons
  accentLine: string;
};

const PALETTES: Record<Element, { normal: Palette; rare: Palette }> = {
  earth: {
    normal: {
      dark: "#7A6C56", mid: "#9C8B70", light: "#B8A98E", line: "#3E352B",
      glow: "#EF9F27", glowCore: "#FCD98A", iris: "#BA7517", pupil: "#2C1F14",
      accent: "#7A9A3A", accentLine: "#3B6D11",
    },
    // Obsidian, lit blue from inside.
    rare: {
      dark: "#2C2C2A", mid: "#444441", light: "#5F5E5A", line: "#111110",
      glow: "#378ADD", glowCore: "#B5D4F4", iris: "#378ADD", pupil: "#042C53",
      accent: "#3B6D11", accentLine: "#173404",
    },
  },
  water: {
    normal: {
      dark: "#2F7FCF", mid: "#5DA2E8", light: "#A9CFF5", line: "#0C447C",
      glow: "#5DCAA5", glowCore: "#E1F5EE", iris: "#1D9E75", pupil: "#042C53",
      accent: "#85B7EB", accentLine: "#0C447C",
    },
    // Coral reef.
    rare: {
      dark: "#D4537E", mid: "#ED93B1", light: "#F4C0D1", line: "#4B1528",
      glow: "#5DCAA5", glowCore: "#E1F5EE", iris: "#0F6E56", pupil: "#4B1528",
      accent: "#9FE1CB", accentLine: "#085041",
    },
  },
  fire: {
    normal: {
      dark: "#B8452A", mid: "#E06A3A", light: "#F4A27A", line: "#4A1B0C",
      glow: "#FAC775", glowCore: "#FFF3D6", iris: "#EF9F27", pupil: "#4A1B0C",
      accent: "#FAC775", accentLine: "#BA7517",
    },
    // Blue flame - hotter than the ordinary kind.
    rare: {
      dark: "#185FA5", mid: "#378ADD", light: "#85B7EB", line: "#042C53",
      glow: "#B5D4F4", glowCore: "#E6F1FB", iris: "#85B7EB", pupil: "#042C53",
      accent: "#B5D4F4", accentLine: "#185FA5",
    },
  },
  electricity: {
    normal: {
      dark: "#D9A520", mid: "#F2C744", light: "#FBE38E", line: "#5A4207",
      glow: "#378ADD", glowCore: "#E6F1FB", iris: "#378ADD", pupil: "#042C53",
      accent: "#E6F1FB", accentLine: "#185FA5",
    },
    // Violet storm.
    rare: {
      dark: "#534AB7", mid: "#7F77DD", light: "#AFA9EC", line: "#26215C",
      glow: "#FAC775", glowCore: "#FFF3D6", iris: "#FAC775", pupil: "#26215C",
      accent: "#FFF3D6", accentLine: "#BA7517",
    },
  },
  gravity: {
    normal: {
      dark: "#3C3489", mid: "#534AB7", light: "#7F77DD", line: "#1A1640",
      glow: "#AFA9EC", glowCore: "#EEEDFE", iris: "#AFA9EC", pupil: "#1A1640",
      accent: "#EEEDFE", accentLine: "#1A1640",
    },
    // A small sun.
    rare: {
      dark: "#BA7517", mid: "#EF9F27", light: "#FAC775", line: "#412402",
      glow: "#FFF3D6", glowCore: "#FFFFFF", iris: "#D85A30", pupil: "#412402",
      accent: "#FFF3D6", accentLine: "#854F0B",
    },
  },
};

export function paletteOf(element: Element, rare: boolean): Palette {
  return PALETTES[element][rare ? "rare" : "normal"];
}

// The square spiral rune from the egg, centred on 0,0.
const SPIRAL = "M -9 -9 L 9 -9 L 9 9 L -9 9 L -9 -6 L 6 -6 L 6 6 L -6 6 L -6 -3 L 3 -3 L 3 3 L -3 3 L -3 0";
const BLUSH = "#F0997B";
const SPARKLE = "l 3 -7 l 3 7 l 7 3 l -7 3 l -3 7 l -3 -7 l -7 -3 Z";

/** A line that glows: soft wide stroke underneath, thin bright one on top. */
function Glow({ d, p, width = 1.5, wide = 5 }: { d: string; p: Palette; width?: number; wide?: number }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={p.glow} strokeWidth={wide} opacity={0.45} className="pet-glow" />
      <path d={d} stroke={p.glowCore} strokeWidth={width} />
    </g>
  );
}

/** Head and body proportions for each stage that has a body. */
const SHAPES = {
  hatchling: {
    head: { cy: -4, rx: 23, ry: 20 },
    body: null,
    arms: null,
    feet: null,
    eye: { x: 9, y: -5, s: 0.85 },
    blush: { x: 17, y: 5, rx: 4, ry: 2.4 },
    mouthY: 5,
    spiral: null,
    shadow: { y: 42, rx: 40 },
    k: 0.77,
  },
  young: {
    head: { cy: -10, rx: 26, ry: 22 },
    body: { cy: 14, rx: 15, ry: 13 },
    arms: { x: 17, y: 13, rx: 5, ry: 6.5, rot: 15 },
    feet: { x: 8, y: 27, rx: 7, ry: 4 },
    eye: { x: 10, y: -9, s: 0.9 },
    blush: { x: 18, y: 1, rx: 4.5, ry: 2.5 },
    mouthY: 2,
    spiral: { y: 17, s: 0.38 },
    shadow: { y: 32, rx: 26 },
    k: 0.87,
  },
  adult: {
    head: { cy: -16, rx: 30, ry: 26 },
    body: { cy: 18, rx: 20, ry: 17 },
    arms: { x: 22, y: 16, rx: 6, ry: 8, rot: 25 },
    feet: { x: 10, y: 34, rx: 9, ry: 5 },
    eye: { x: 12, y: -14, s: 1 },
    blush: { x: 21, y: -3, rx: 5, ry: 2.8 },
    mouthY: -2,
    spiral: { y: 21, s: 0.5 },
    shadow: { y: 40, rx: 30 },
    k: 1,
  },
};
type Shape = (typeof SHAPES)[keyof typeof SHAPES];

function shapeFor(stage: Exclude<Stage, "egg">): Shape {
  return stage === "hatchling" ? SHAPES.hatchling : stage === "young" ? SHAPES.young : SHAPES.adult;
}

/** A stone-shaded ellipse: base with outline, a mid tone, a highlight. */
function Shaded({ cx = 0, cy, rx, ry, p }: { cx?: number; cy: number; rx: number; ry: number; p: Palette }) {
  return (
    <>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={p.dark} stroke={p.line} strokeWidth={2.2} />
      <ellipse cx={cx - rx * 0.1} cy={cy - ry * 0.12} rx={rx * 0.86} ry={ry * 0.85} fill={p.mid} />
      <ellipse cx={cx - rx * 0.33} cy={cy - ry * 0.46} rx={rx * 0.4} ry={ry * 0.27} fill={p.light} />
    </>
  );
}

function Eye({ x, y, s, p }: { x: number; y: number; s: number; p: Palette }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="pet-blink">
        <ellipse rx={7.5} ry={9.5} fill={p.pupil} />
        <ellipse cy={3.5} rx={6} ry={5} fill={p.iris} />
        <ellipse cx={-2.5} cy={-3.5} rx={3} ry={3.6} fill="#fff" />
        <circle cx={3} cy={4.5} r={1.4} fill="#fff" />
      </g>
    </g>
  );
}

function Face({ shape, mood, p }: { shape: Shape; mood: Mood; p: Palette }) {
  const { eye, blush, mouthY } = shape;
  const s = eye.s;
  const arc = (x: number, lift: number) =>
    `M ${x - 6 * s} ${eye.y + 1} Q ${x} ${eye.y + lift * s} ${x + 6 * s} ${eye.y + 1}`;

  let eyes;
  if (mood === "happy") {
    eyes = (
      <path d={`${arc(-eye.x, -8)} ${arc(eye.x, -8)}`} fill="none" stroke={p.pupil} strokeWidth={3 * s} strokeLinecap="round" />
    );
  } else if (mood === "asleep") {
    eyes = (
      <path d={`${arc(-eye.x, 4)} ${arc(eye.x, 4)}`} fill="none" stroke={p.pupil} strokeWidth={2.6 * s} strokeLinecap="round" />
    );
  } else {
    eyes = (
      <>
        <Eye x={-eye.x} y={eye.y} s={s} p={p} />
        <Eye x={eye.x} y={eye.y} s={s} p={p} />
      </>
    );
  }

  let mouth;
  if (mood === "happy" || mood === "back") {
    mouth = <path d={`M -4 ${mouthY - 1} Q 0 ${mouthY + 7} 4 ${mouthY - 1} Z`} fill="#993556" stroke={p.line} strokeWidth={1.2} />;
  } else if (mood === "asleep") {
    mouth = <ellipse cy={mouthY + 1} rx={1.8} ry={2.2} fill={p.pupil} />;
  } else if (mood === "waiting") {
    mouth = <path d={`M -3 ${mouthY + 1} L 3 ${mouthY + 1}`} stroke={p.line} strokeWidth={1.6} strokeLinecap="round" />;
  } else {
    mouth = <path d={`M -3 ${mouthY} Q 0 ${mouthY + 3} 3 ${mouthY}`} fill="none" stroke={p.line} strokeWidth={1.6} strokeLinecap="round" />;
  }

  return (
    <>
      {eyes}
      <ellipse cx={-blush.x} cy={blush.y} rx={blush.rx} ry={blush.ry} fill={BLUSH} opacity={0.55} />
      <ellipse cx={blush.x} cy={blush.y} rx={blush.rx} ry={blush.ry} fill={BLUSH} opacity={0.55} />
      {mouth}
    </>
  );
}

/** Horns, fins or lightning ears - whatever this element grows on its head. */
function HeadGear({ element, shape, p }: { element: Element; shape: Shape; p: Palette }) {
  const top = shape.head.cy - shape.head.ry;
  const k = shape.k;
  if (element === "water") {
    const fin = "M -26 -10 Q -46 -24 -42 0 Q -36 -4 -29 1 Z M 26 -10 Q 46 -24 42 0 Q 36 -4 29 1 Z";
    return (
      <path d={fin} transform={`translate(0 ${shape.head.cy}) scale(${k})`} fill={p.light} stroke={p.line} strokeWidth={2} strokeLinejoin="round" />
    );
  }
  if (element === "electricity") {
    const ears = "M -20 6 L -32 -8 L -24 -9 L -30 -24 L -12 -3 L -18 -3 L -11 3 Z M 20 6 L 32 -8 L 24 -9 L 30 -24 L 12 -3 L 18 -3 L 11 3 Z";
    return (
      <path d={ears} transform={`translate(0 ${top}) scale(${k})`} fill={p.dark} stroke={p.line} strokeWidth={2} strokeLinejoin="round" />
    );
  }
  const horns = "M -16 4 Q -26 -14 -19 -12 Q -12 -6 -8 0 Z M 16 4 Q 26 -14 19 -12 Q 12 -6 8 0 Z";
  return (
    <path d={horns} transform={`translate(0 ${top}) scale(${k})`} fill={p.dark} stroke={p.line} strokeWidth={2} strokeLinejoin="round" />
  );
}

/** What sits on top of the head, drawn from the crown of the head upwards. */
function Topper({ element, final, p }: { element: Element; final: boolean; p: Palette }) {
  switch (element) {
    case "earth":
      return final ? (
        <g>
          <path d="M 4 1 Q 5 -6 4 -12" fill="none" stroke={p.accentLine} strokeWidth={2} />
          <path d="M 4 -5 Q -6 -11 -9 -3 Q -2 -1 4 -5 Z" fill={p.accent} stroke={p.accentLine} strokeWidth={1.2} />
          {[
            [4, -20],
            [-2, -16],
            [10, -16],
            [0, -10.5],
            [8, -10.5],
          ].map(([x, y]) => (
            <circle key={`${x},${y}`} cx={x} cy={y} r={3.6} fill="#F4C0D1" stroke="#993556" strokeWidth={1} />
          ))}
          <circle cx={4} cy={-15} r={2.6} fill="#FAC775" />
        </g>
      ) : (
        <g>
          <path d="M 4 1 Q 5 -5 4 -9" fill="none" stroke={p.accentLine} strokeWidth={2} strokeLinecap="round" />
          <path d="M 4 -8 Q -5 -15 -8 -7 Q -1 -5 4 -8 Z M 4 -8 Q 13 -15 16 -7 Q 9 -5 4 -8 Z" fill={p.accent} stroke={p.accentLine} strokeWidth={1.3} />
        </g>
      );
    case "water":
      return final ? (
        <g>
          <path d="M -10 2 Q -6 -28 14 -20 Q 4 -14 10 2 Z" fill={p.light} stroke={p.line} strokeWidth={2} strokeLinejoin="round" />
          <path d="M -2 -4 Q 2 -18 10 -18" fill="none" stroke={p.line} strokeWidth={1} opacity={0.6} />
        </g>
      ) : (
        <g className="pet-float">
          <path d="M 0 -22 Q 9 -10 0 -5 Q -9 -10 0 -22 Z" fill={p.accent} stroke={p.accentLine} strokeWidth={1.6} />
          <ellipse cx={-2.5} cy={-11} rx={1.6} ry={2.4} fill="#fff" />
        </g>
      );
    case "fire":
      return final ? (
        <g className="pet-flicker">
          <path
            d="M -22 6 Q -28 -10 -18 -16 Q -16 -6 -9 -6 Q -10 -20 0 -30 Q 4 -18 8 -8 Q 14 -18 20 -20 Q 18 -8 24 4 Q 0 -2 -22 6 Z"
            fill={p.accent}
            stroke={p.accentLine}
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
          <path d="M -8 0 Q -10 -8 -4 -12 Q -2 -6 0 -6 Q 2 -16 6 -18 Q 6 -8 10 0 Z" fill={p.glowCore} />
        </g>
      ) : (
        <g className="pet-flicker">
          <path
            d="M -8 2 Q -12 -10 -4 -16 Q -4 -8 0 -8 Q 2 -18 8 -24 Q 6 -12 11 -6 Q 10 1 6 2 Z"
            fill={p.accent}
            stroke={p.accentLine}
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
          <path d="M -2 1 Q -4 -5 1 -10 Q 3 -4 5 1 Z" fill={p.glowCore} />
        </g>
      );
    case "electricity":
      return (
        <g>
          <path d="M 0 0 L 0 -12" stroke={p.line} strokeWidth={2} />
          <circle cy={-15} r={final ? 8.5 : 7} fill={p.glow} opacity={0.45} className="pet-glow" />
          <circle cy={-15} r={final ? 4.4 : 3.6} fill={p.glowCore} stroke={p.accentLine} strokeWidth={1.2} />
        </g>
      );
    case "gravity":
      return final ? (
        <g className="pet-float">
          <path d="M -16 -18 A 16 4 0 0 1 16 -18" fill="none" stroke={p.glow} strokeWidth={2} />
          <circle cy={-18} r={7} fill={p.accent} stroke={p.accentLine} strokeWidth={1.4} />
          <circle cx={-2} cy={-20} r={1.6} fill={p.glow} />
          <path d="M 16 -18 A 16 4 0 0 1 -16 -18" fill="none" stroke={p.glow} strokeWidth={2} />
        </g>
      ) : (
        <g className="pet-float">
          <ellipse cy={-8} rx={24} ry={5} fill="none" stroke={p.glow} strokeWidth={4} opacity={0.45} />
          <ellipse cy={-8} rx={24} ry={5} fill="none" stroke={p.glowCore} strokeWidth={1.2} />
          <circle cx={21} cy={-6} r={5.5} fill={p.accent} stroke={p.accentLine} strokeWidth={1.4} />
          <circle cx={19.5} cy={-7} r={1.4} fill={p.glow} />
          <circle cx={-19} cy={-10} r={2.6} fill={p.light} stroke={p.line} strokeWidth={1} />
        </g>
      );
  }
}

/** Final-form extras drawn behind the body. */
function FinalBehind({ element, p }: { element: Element; p: Palette }) {
  switch (element) {
    case "earth":
      return (
        <g>
          <path
            d="M -22 -2 L -42 -26 L -36 -34 L -16 -10 Z M -26 8 L -44 0 L -38 -6 Z M 22 0 L 42 -22 L 47 -14 L 28 6 Z"
            fill="#5DCAA5"
            stroke="#085041"
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <path d="M -39 -30 L -22 -8 M 44 -18 L 28 0" fill="none" stroke="#E1F5EE" strokeWidth={1.4} />
        </g>
      );
    case "water":
      return (
        <g>
          <ellipse cy={38} rx={36} ry={6} fill="none" stroke={p.accent} strokeWidth={1.5} />
          <ellipse cy={38} rx={46} ry={8} fill="none" stroke={p.accent} strokeWidth={1} opacity={0.6} />
        </g>
      );
    case "fire":
      return (
        <g className="pet-flicker">
          <path d="M 16 26 Q 40 32 46 8 Q 52 26 40 36 Q 30 40 16 32 Z" fill={p.accent} stroke={p.accentLine} strokeWidth={1.4} strokeLinejoin="round" />
          <path d="M 24 30 Q 38 30 42 20 Q 42 30 34 34 Z" fill={p.glowCore} />
        </g>
      );
    case "electricity":
      return <Glow d="M -30 -66 L -18 -74 L -10 -66 L 0 -77 L 10 -67 L 18 -74 L 30 -66" p={p} width={1.8} wide={6} />;
    case "gravity":
      return (
        <g transform="translate(0 18) rotate(-10)">
          <Glow d="M -48 0 A 48 11 0 0 1 48 0" p={p} width={1.2} wide={4} />
        </g>
      );
  }
}

/** Final-form extras drawn in front of the body. */
function FinalFront({ element, p }: { element: Element; p: Palette }) {
  switch (element) {
    case "earth":
      return (
        <path d="M -28 14 L -36 6 L -30 4 Z" fill="#5DCAA5" stroke="#085041" strokeWidth={1.3} strokeLinejoin="round" />
      );
    case "water":
      return (
        <path
          className="pet-float"
          d="M -38 -54 Q -32 -45 -38 -41 Q -44 -45 -38 -54 Z M 36 -60 Q 41 -52 36 -49 Q 31 -52 36 -60 Z M 46 14 Q 51 22 46 25 Q 41 22 46 14 Z"
          fill={p.accent}
          stroke={p.accentLine}
          strokeWidth={1.3}
        />
      );
    case "fire":
      return (
        <g className="pet-glow">
          <circle cx={-38} cy={-46} r={2.2} fill={p.accent} />
          <circle cx={40} cy={-40} r={1.8} fill={p.glowCore} />
          <circle cx={-44} cy={-14} r={1.8} fill={p.accent} />
          <circle cx={32} cy={-64} r={1.6} fill={p.glowCore} />
        </g>
      );
    case "electricity":
      return <Glow d="M -34 14 L -42 10 L -38 18 L -46 16 M 34 14 L 42 10 L 38 18 L 46 16" p={p} width={1.6} />;
    case "gravity":
      return (
        <g transform="translate(0 18) rotate(-10)">
          <Glow d="M 48 0 A 48 11 0 0 1 -48 0" p={p} width={1.2} wide={4} />
          <path
            d="M 15 9 L 20 5 L 26 9 L 23 14 L 17 14 Z M -46 4 L -41 1 L -37 5 L -40 9 Z M 44 -4 L 48 -7 L 52 -3 L 48 0 Z"
            fill={p.light}
            stroke={p.line}
            strokeWidth={1.3}
            strokeLinejoin="round"
          />
        </g>
      );
  }
}

/** Moss for Earth, bubbles for Water - small marks that make the body theirs. */
function BodyMarks({ element, shape, p }: { element: Element; shape: Shape; p: Palette }) {
  const k = shape.k;
  const hy = shape.head.cy;
  if (element === "earth") {
    return (
      <g fill={p.accent}>
        <circle cx={-18 * k} cy={hy - 20 * k} r={4 * k} />
        <circle cx={-23 * k} cy={hy - 16 * k} r={3 * k} />
        <circle cx={-13 * k} cy={hy - 23 * k} r={3 * k} />
        {shape.body && <circle cx={13 * k} cy={shape.body.cy + 10 * k} r={3 * k} />}
      </g>
    );
  }
  if (element === "water") {
    return (
      <g fill="none" stroke="#E6F1FB" strokeWidth={1.2}>
        <circle cx={-24 * k} cy={hy - 14 * k} r={2 * k} />
        {shape.body && <circle cx={14 * k} cy={shape.body.cy + 8 * k} r={2.6 * k} />}
      </g>
    );
  }
  return null;
}

function Creature({ look, p }: { look: PetLook & { stage: Exclude<Stage, "egg"> }; p: Palette }) {
  const { element, stage, mood } = look;
  const shape = shapeFor(stage);
  const final = stage === "final";
  const top = shape.head.cy - shape.head.ry;
  // The topper shrinks with the head, except on the final form where it is
  // the showpiece.
  const topperScale = final ? 1 : shape.k;

  return (
    <>
      <ellipse cy={shape.shadow.y} rx={shape.shadow.rx} ry={4} fill="#000" opacity={0.12} />
      <g className="pet-bob">
        {final && <FinalBehind element={element} p={p} />}
        {stage === "hatchling" && (
          <path d="M -30 16 L -24 0 L -16 6 L -14 20 Z" fill={p.dark} stroke={p.line} strokeWidth={1.5} strokeLinejoin="round" />
        )}
        {stage !== "hatchling" && <HeadGear element={element} shape={shape} p={p} />}
        {shape.feet && (
          <>
            <ellipse cx={-shape.feet.x} cy={shape.feet.y} rx={shape.feet.rx} ry={shape.feet.ry} fill={p.dark} stroke={p.line} strokeWidth={2} />
            <ellipse cx={shape.feet.x} cy={shape.feet.y} rx={shape.feet.rx} ry={shape.feet.ry} fill={p.dark} stroke={p.line} strokeWidth={2} />
          </>
        )}
        {shape.arms && (
          <>
            <ellipse
              cx={-shape.arms.x} cy={shape.arms.y} rx={shape.arms.rx} ry={shape.arms.ry}
              transform={`rotate(${shape.arms.rot} ${-shape.arms.x} ${shape.arms.y})`}
              fill={p.dark} stroke={p.line} strokeWidth={2}
            />
            <ellipse
              cx={shape.arms.x} cy={shape.arms.y} rx={shape.arms.rx} ry={shape.arms.ry}
              transform={`rotate(${-shape.arms.rot} ${shape.arms.x} ${shape.arms.y})`}
              fill={p.dark} stroke={p.line} strokeWidth={2}
            />
          </>
        )}
        {shape.body && <Shaded cy={shape.body.cy} rx={shape.body.rx} ry={shape.body.ry} p={p} />}
        {shape.spiral && (
          <g transform={`translate(0 ${shape.spiral.y}) rotate(45) scale(${shape.spiral.s})`}>
            <Glow d={SPIRAL} p={p} width={2.6} wide={final ? 7 : 5} />
          </g>
        )}
        <Shaded cy={shape.head.cy} rx={shape.head.rx} ry={shape.head.ry} p={p} />
        <BodyMarks element={element} shape={shape} p={p} />
        <Face shape={shape} mood={mood} p={p} />
        <g transform={`translate(0 ${top + 1}) scale(${topperScale})`}>
          <Topper element={element} final={final} p={p} />
        </g>
        {final && <FinalFront element={element} p={p} />}
        {stage === "hatchling" && (
          // The half-shell it sits in, low enough to leave the whole face clear.
          <g transform="translate(0 10)">
            <path
              d="M -28 8 L -20 0 L -12 8 L -3 0 L 6 8 L 14 0 L 22 8 L 28 6 Q 30 30 0 31 Q -30 30 -28 8 Z"
              fill={p.mid}
              stroke={p.line}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            <Glow d="M -3 1 L 0 14 L 6 23" p={p} />
          </g>
        )}
      </g>
      {mood === "asleep" && (
        <path
          className="pet-zz"
          d="M 28 -44 L 36 -44 L 28 -36 L 36 -36 M 40 -58 L 46 -58 L 40 -52 L 46 -52"
          fill="none"
          stroke={p.line}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {mood === "back" && (
        <g fill={p.glow} className="pet-glow">
          <path d={`M -48 -36 ${SPARKLE}`} />
          <path d={`M 40 -44 ${SPARKLE}`} transform="translate(40 -44) scale(0.7) translate(-40 44)" />
          <path d={`M 40 6 ${SPARKLE}`} transform="translate(40 6) scale(0.7) translate(-40 -6)" />
        </g>
      )}
    </>
  );
}

/** Extras that make each element's egg its own. */
function EggMarks({ element, p }: { element: Element; p: Palette }) {
  switch (element) {
    case "earth":
      return (
        <g>
          <g fill={p.accent}>
            <circle cx={-20} cy={-26} r={3.5} />
            <circle cx={-24} cy={-22} r={2.5} />
            <circle cx={24} cy={12} r={3.5} />
          </g>
          <g transform="translate(0 -39)">
            <Topper element="earth" final={false} p={p} />
          </g>
        </g>
      );
    case "water":
      return (
        <path
          className="pet-float"
          d="M -44 -14 Q -38 -4 -44 0 Q -50 -4 -44 -14 Z M 42 -30 Q 47 -22 42 -19 Q 37 -22 42 -30 Z M 46 14 Q 50 21 46 24 Q 42 21 46 14 Z"
          fill={p.accent}
          stroke={p.accentLine}
          strokeWidth={1.2}
        />
      );
    case "fire":
      return (
        <g className="pet-glow">
          <circle cx={-38} cy={-30} r={2.5} fill={p.accent} />
          <circle cx={40} cy={-38} r={2} fill={p.accent} />
          <circle cx={-44} cy={8} r={1.8} fill={p.dark} />
          <circle cx={44} cy={2} r={2.5} fill={p.dark} />
          <circle cx={-30} cy={-46} r={1.6} fill={p.glowCore} />
          <circle cx={34} cy={-52} r={1.8} fill={p.glowCore} />
        </g>
      );
    case "electricity":
      return (
        <g className="pet-glow">
          <Glow d="M -38 -28 L -46 -20 L -40 -18 L -48 -8 M 38 -12 L 47 -6 L 41 -2 L 50 8 M 34 -44 L 40 -50 M -36 24 L -44 28" p={p} width={1.8} />
        </g>
      );
    case "gravity":
      return null;
  }
}

function Egg({ element, warmth, p }: { element: Element; warmth: number; p: Palette }) {
  // warmth runs 0 to 1 as the egg nears hatching; at 1 it is ready and
  // wobbling, with extra cracks and light escaping from the top.
  const ready = warmth >= 1;
  const diamond = "M 0 -22 L 19 -2 L 0 19 L -19 -2 Z M 0 -22 L -3 -34 M 19 -2 L 30 -8 M 0 19 L 3 33 M -19 -2 L -30 4";
  const floating = element === "gravity";
  return (
    <>
      <ellipse cy={floating ? 50 : 40} rx={floating ? 30 : 44} ry={floating ? 4 : 6} fill="#000" opacity={floating ? 0.12 : 0.18} />
      {element === "water" && <ellipse cy={40} rx={30} ry={4} fill="none" stroke={p.accent} strokeWidth={1.2} />}
      {floating && (
        <g transform="translate(0 -4) rotate(-12)">
          <Glow d="M -50 4 A 50 12 0 0 1 50 4" p={p} width={1.2} wide={4} />
        </g>
      )}
      <g className={ready ? "pet-wobble" : "pet-bob-slow"}>
        <g transform={floating ? "translate(0 -4)" : undefined}>
          <ellipse rx={33} ry={40} fill={p.dark} stroke={p.line} strokeWidth={2.2} />
          <ellipse cx={-4} cy={-3} rx={28} ry={36} fill={p.mid} />
          <ellipse cx={-11} cy={-12} rx={14} ry={20} fill={p.light} />
          <g opacity={0.55 + 0.45 * Math.min(1, warmth)}>
            <Glow d={diamond} p={p} wide={4 + 4 * Math.min(1, warmth)} />
          </g>
          <g transform="translate(0 -2) rotate(45) scale(0.9)">
            <path d={SPIRAL} fill="none" stroke={element === "earth" ? p.accent : p.line} strokeWidth={2.6} opacity={element === "earth" ? 1 : 0.55} />
          </g>
          {ready && (
            <>
              <Glow d="M 0 -22 L 6 -38 M -19 -2 L -30 -14 M 19 -2 L 30 14 M -8 10 L -24 22" p={p} width={2} wide={8} />
              <Glow d="M -6 -45 L -8 -52 M 5 -45 L 8 -52 M -1 -46 L -1 -55" p={p} width={2} wide={4} />
            </>
          )}
        </g>
      </g>
      {floating && (
        <g transform="translate(0 -4) rotate(-12)">
          <Glow d="M 50 4 A 50 12 0 0 1 -50 4" p={p} width={1.2} wide={4} />
          <circle cx={22} cy={14} r={4.5} fill={p.light} stroke={p.line} strokeWidth={1.3} />
          <circle cx={-42} cy={10} r={3.5} fill={p.light} stroke={p.line} strokeWidth={1.3} />
        </g>
      )}
      <EggMarks element={element} p={p} />
    </>
  );
}

// The whole drawing fits these boxes; "face" crops tighter around the head
// for icon sizes, where a whole pet would be an unreadable smudge. Every
// creature shares one box so a pet does not jump about as it grows.
const FULL_BOX: Record<Stage, string> = {
  egg: "-58 -66 116 116",
  hatchling: "-60 -82 120 132",
  young: "-60 -82 120 132",
  adult: "-60 -82 120 132",
  final: "-60 -82 120 132",
};
const FACE_BOX: Record<Stage, string> = {
  egg: "-48 -52 96 96",
  hatchling: "-32 -36 64 64",
  young: "-34 -44 68 68",
  adult: "-38 -56 76 76",
  final: "-40 -60 80 80",
};

export function PetArt({
  look,
  face = false,
  warmth = 0,
  still = false,
  className,
  title,
}: {
  look: PetLook;
  /** Crop to the head, for anything drawn below about 64px. */
  face?: boolean;
  /** Egg only: 0 to 1, how close it is to hatching. */
  warmth?: number;
  /** No idle animation - for places that already animate the whole picture. */
  still?: boolean;
  className?: string;
  /** Read out to screen readers. Omitted, the drawing is decorative. */
  title?: string;
}) {
  const p = paletteOf(look.element, look.rare);
  return (
    <svg
      viewBox={(face ? FACE_BOX : FULL_BOX)[look.stage]}
      className={`${still ? "pet-still" : ""} ${className ?? ""}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      overflow="visible"
    >
      {look.stage === "egg" ? (
        <Egg element={look.element} warmth={warmth} p={p} />
      ) : (
        <Creature look={{ ...look, stage: look.stage }} p={p} />
      )}
    </svg>
  );
}
