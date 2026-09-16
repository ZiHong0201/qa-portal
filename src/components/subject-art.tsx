// Hand-drawn scenes, one per subject. Parts tagged with .swing / .bubble /
// .sway / .spin / .float sit still until the surrounding tile is hovered or
// focused - see the `.subject-tile:hover` rules in globals.css. Drawn as SVG
// rather than shipped as images so they stay crisp at any tile size and cost
// nothing to load.

const VIEW_BOX = "0 0 120 90";

function Physics() {
  return (
    <svg viewBox={VIEW_BOX} className="h-full w-full" aria-hidden="true">
      {/* path the ball traces */}
      <path
        d="M36 58 Q60 76 84 58"
        fill="none"
        stroke="#bae6fd"
        strokeWidth="2"
        strokeDasharray="3 4"
        strokeLinecap="round"
      />
      {/* frame */}
      <rect x="24" y="14" width="72" height="6" rx="3" fill="#94a3b8" />
      <g className="swing" style={{ transformOrigin: "60px 18px" }}>
        <line x1="60" y1="18" x2="60" y2="58" stroke="#64748b" strokeWidth="2" />
        <circle cx="60" cy="64" r="9" fill="#0ea5e9" stroke="#0369a1" strokeWidth="2" />
        <circle cx="57" cy="61" r="2.6" fill="#e0f2fe" opacity="0.8" />
      </g>
      <circle cx="60" cy="18" r="3.4" fill="#475569" />
    </svg>
  );
}

function Chemistry() {
  return (
    <svg viewBox={VIEW_BOX} className="h-full w-full" aria-hidden="true">
      {/* bubbles escaping the neck */}
      <circle className="bubble" cx="55" cy="62" r="3" fill="#6ee7b7" style={{ animationDelay: "0s" }} />
      <circle className="bubble" cx="63" cy="66" r="2.2" fill="#a7f3d0" style={{ animationDelay: "0.5s" }} />
      <circle className="bubble" cx="59" cy="70" r="2.6" fill="#34d399" style={{ animationDelay: "1s" }} />
      {/* flask */}
      <path
        d="M52 26 L52 40 L34 70 Q30 78 39 78 L81 78 Q90 78 86 70 L68 40 L68 26 Z"
        fill="#f8fafc"
        stroke="#64748b"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* liquid */}
      <path
        d="M39.5 64 L80.5 64 L86 70 Q90 78 81 78 L39 78 Q30 78 34 70 Z"
        fill="#34d399"
      />
      <path d="M39.5 64 L80.5 64" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
      {/* neck lip */}
      <rect x="49" y="21" width="22" height="6" rx="3" fill="#475569" />
      <path d="M56 46 L56 60" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

function Biology() {
  return (
    <svg viewBox={VIEW_BOX} className="h-full w-full" aria-hidden="true">
      {/* soil line */}
      <path d="M32 80 Q60 86 88 80" fill="none" stroke="#a8a29e" strokeWidth="3" strokeLinecap="round" />
      <g className="sway" style={{ transformOrigin: "60px 80px" }}>
        {/* small back leaf */}
        <path
          d="M60 74 C 46 68 40 54 52 42 C 64 50 66 64 60 74 Z"
          fill="#86efac"
          stroke="#22c55e"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* main leaf */}
        <path
          d="M60 78 C 78 66 82 40 60 16 C 38 40 42 66 60 78 Z"
          fill="#34d399"
          stroke="#047857"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path d="M60 78 L60 22" stroke="#047857" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M60 40 L70 34" stroke="#047857" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        <path d="M60 50 L72 46" stroke="#047857" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        <path d="M60 60 L71 58" stroke="#047857" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        <path d="M60 40 L50 34" stroke="#047857" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        <path d="M60 50 L48 46" stroke="#047857" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      </g>
    </svg>
  );
}

function Mathematics() {
  return (
    <svg viewBox={VIEW_BOX} className="h-full w-full" aria-hidden="true">
      <circle
        cx="60"
        cy="48"
        r="27"
        fill="#f5f3ff"
        stroke="#a78bfa"
        strokeWidth="2.4"
        strokeDasharray="5 5"
      />
      {/* right-angled triangle inscribed */}
      <path
        d="M39 62 L81 62 L81 30 Z"
        fill="#ddd6fe"
        fillOpacity="0.7"
        stroke="#7c3aed"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M75 62 L75 56 L81 56" fill="none" stroke="#7c3aed" strokeWidth="1.6" />
      {/* compass arm sweeping the circle */}
      <g className="spin" style={{ transformOrigin: "60px 48px" }}>
        <line x1="60" y1="48" x2="60" y2="21" stroke="#6d28d9" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="60" cy="21" r="3.6" fill="#8b5cf6" />
      </g>
      <circle cx="60" cy="48" r="3.4" fill="#4c1d95" />
    </svg>
  );
}

function English() {
  return (
    <svg viewBox={VIEW_BOX} className="h-full w-full" aria-hidden="true">
      {/* floating letters */}
      <text
        className="float"
        x="30"
        y="26"
        fontSize="15"
        fontWeight="bold"
        fill="#f59e0b"
        style={{ animationDelay: "0s" }}
      >
        A
      </text>
      <text
        className="float"
        x="82"
        y="22"
        fontSize="12"
        fontWeight="bold"
        fill="#fbbf24"
        style={{ animationDelay: "0.6s" }}
      >
        a
      </text>
      {/* open book */}
      <path
        d="M60 40 C 50 33 36 32 24 36 L24 74 C 36 70 50 71 60 78 Z"
        fill="#fffbeb"
        stroke="#b45309"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M60 40 C 70 33 84 32 96 36 L96 74 C 84 70 70 71 60 78 Z"
        fill="#fef3c7"
        stroke="#b45309"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M60 40 L60 78" stroke="#b45309" strokeWidth="2.2" />
      <path d="M32 46 L52 49" stroke="#d97706" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <path d="M32 54 L52 57" stroke="#d97706" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <path d="M32 62 L46 64" stroke="#d97706" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <path d="M68 49 L88 46" stroke="#d97706" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <path d="M68 57 L88 54" stroke="#d97706" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <path d="M68 65 L82 63" stroke="#d97706" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function Science() {
  return (
    <svg viewBox={VIEW_BOX} className="h-full w-full" aria-hidden="true">
      {/* orbits */}
      <ellipse cx="60" cy="48" rx="34" ry="14" fill="none" stroke="#67e8f9" strokeWidth="2.2" />
      <ellipse
        cx="60"
        cy="48"
        rx="34"
        ry="14"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="2.2"
        transform="rotate(60 60 48)"
      />
      <ellipse
        cx="60"
        cy="48"
        rx="34"
        ry="14"
        fill="none"
        stroke="#06b6d4"
        strokeWidth="2.2"
        transform="rotate(-60 60 48)"
      />
      {/* electron riding the flat orbit */}
      <g className="spin" style={{ transformOrigin: "60px 48px" }}>
        <circle cx="94" cy="48" r="4.4" fill="#0891b2" />
      </g>
      <circle cx="60" cy="48" r="10" fill="#0e7490" />
      <circle cx="56.5" cy="44.5" r="3" fill="#a5f3fc" opacity="0.8" />
    </svg>
  );
}

function General() {
  return (
    <svg viewBox={VIEW_BOX} className="h-full w-full" aria-hidden="true">
      <text
        className="float"
        x="82"
        y="28"
        fontSize="18"
        fill="#facc15"
        style={{ animationDelay: "0.2s" }}
      >
        &#10022;
      </text>
      {/* stack of books */}
      <rect x="30" y="66" width="60" height="12" rx="3" fill="#94a3b8" stroke="#475569" strokeWidth="2" />
      <rect x="34" y="53" width="54" height="12" rx="3" fill="#7dd3fc" stroke="#0369a1" strokeWidth="2" />
      <rect x="28" y="40" width="58" height="12" rx="3" fill="#fca5a5" stroke="#b91c1c" strokeWidth="2" />
      <path d="M40 46 L40 52" stroke="#b91c1c" strokeWidth="1.6" />
      <path d="M46 59 L46 65" stroke="#0369a1" strokeWidth="1.6" />
      <path d="M42 72 L42 78" stroke="#475569" strokeWidth="1.6" />
    </svg>
  );
}

const ART: Record<string, () => React.ReactElement> = {
  Physics,
  Chemistry,
  Biology,
  Mathematics,
  English,
  Science,
  General,
};

export function SubjectArt({ subject }: { subject: string }) {
  const Art = ART[subject] ?? General;
  return <Art />;
}

// Tailwind only ships classes it can see in source, so these are written out
// in full rather than built from the subject name.
export const SUBJECT_THEME: Record<
  string,
  { band: string; ring: string; text: string; bar: string }
> = {
  Physics: {
    band: "bg-sky-50",
    ring: "hover:border-sky-300",
    text: "text-sky-700",
    bar: "bg-sky-500",
  },
  Chemistry: {
    band: "bg-emerald-50",
    ring: "hover:border-emerald-300",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
  },
  Biology: {
    band: "bg-green-50",
    ring: "hover:border-green-300",
    text: "text-green-700",
    bar: "bg-green-500",
  },
  Mathematics: {
    band: "bg-violet-50",
    ring: "hover:border-violet-300",
    text: "text-violet-700",
    bar: "bg-violet-500",
  },
  English: {
    band: "bg-amber-50",
    ring: "hover:border-amber-300",
    text: "text-amber-700",
    bar: "bg-amber-500",
  },
  Science: {
    band: "bg-cyan-50",
    ring: "hover:border-cyan-300",
    text: "text-cyan-700",
    bar: "bg-cyan-500",
  },
  General: {
    band: "bg-slate-50",
    ring: "hover:border-slate-300",
    text: "text-slate-700",
    bar: "bg-slate-500",
  },
};

export function themeFor(subject: string) {
  return SUBJECT_THEME[subject] ?? SUBJECT_THEME.General;
}
