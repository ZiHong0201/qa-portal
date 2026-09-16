export function CelebratingCat({
  className,
  // The default matches the inline banners; the completion overlay passes a
  // bigger pair so the cat is the centrepiece there.
  size = "h-16 w-16",
  sparkleSize = "text-base",
}: {
  className?: string;
  size?: string;
  sparkleSize?: string;
}) {
  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      <span
        className={`animate-sparkle absolute -top-2 -left-2 text-yellow-400 ${sparkleSize}`}
        style={{ animationDelay: "0s" }}
      >
        &#10022;
      </span>
      <span
        className={`animate-sparkle absolute top-0 -right-3 text-yellow-400 ${sparkleSize}`}
        style={{ animationDelay: "0.3s" }}
      >
        &#10022;
      </span>
      <span
        className={`animate-sparkle absolute -top-4 left-1/2 -translate-x-1/2 text-yellow-400 ${sparkleSize}`}
        style={{ animationDelay: "0.6s" }}
      >
        &#10022;
      </span>
      <svg viewBox="0 0 100 100" className={`animate-cat-hop ${size}`} aria-hidden="true">
        {/* tail */}
        <path
          d="M71 84 C 90 86 97 68 89 57 C 85 51 77 53 78 61"
          fill="none"
          stroke="#8f8983"
          strokeWidth="9"
          strokeLinecap="round"
        />
        {/* body */}
        <path
          d="M31 50 C 24 66 19 84 26 90 C 33 96 67 96 74 90 C 81 84 76 66 69 50 Z"
          fill="#8f8983"
          stroke="#4a4540"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* chest patch */}
        <path d="M50 56 C 61 61 63 79 59 92 L 41 92 C 37 79 39 61 50 56 Z" fill="#ffffff" />
        {/* front paws */}
        <ellipse cx="39" cy="89" rx="8" ry="5" fill="#ffffff" stroke="#4a4540" strokeWidth="2" />
        <ellipse cx="61" cy="89" rx="8" ry="5" fill="#ffffff" stroke="#4a4540" strokeWidth="2" />
        {/* ears, drawn before the head so their bases stay hidden */}
        <path
          d="M32 27 L25 6 L48 19 Z"
          fill="#8f8983"
          stroke="#4a4540"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M68 27 L75 6 L52 19 Z"
          fill="#8f8983"
          stroke="#4a4540"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path d="M33 22 L29 11 L42 19 Z" fill="#d9b3ae" />
        <path d="M67 22 L71 11 L58 19 Z" fill="#d9b3ae" />
        {/* head */}
        <circle cx="50" cy="40" r="23" fill="#8f8983" stroke="#4a4540" strokeWidth="2.2" />
        {/* muzzle */}
        <ellipse cx="50" cy="52" rx="13" ry="8.5" fill="#ffffff" />
        {/* eyes */}
        <circle cx="40" cy="39" r="5.6" fill="#82b24c" stroke="#4a4540" strokeWidth="1.4" />
        <circle cx="60" cy="39" r="5.6" fill="#82b24c" stroke="#4a4540" strokeWidth="1.4" />
        <ellipse cx="40" cy="39" rx="2.3" ry="4.2" fill="#2f2b27" />
        <ellipse cx="60" cy="39" rx="2.3" ry="4.2" fill="#2f2b27" />
        <circle cx="38.2" cy="36.6" r="1.6" fill="#ffffff" />
        <circle cx="58.2" cy="36.6" r="1.6" fill="#ffffff" />
        {/* blush */}
        <ellipse cx="31" cy="48" rx="4" ry="2.6" fill="#f3b6c4" opacity="0.65" />
        <ellipse cx="69" cy="48" rx="4" ry="2.6" fill="#f3b6c4" opacity="0.65" />
        {/* nose */}
        <path d="M46.6 47.6 Q50 45.4 53.4 47.6 Q50 52 46.6 47.6 Z" fill="#d98b93" />
        {/* mouth */}
        <path
          d="M50 51.4 Q45.6 56.4 41.6 52.6"
          fill="none"
          stroke="#4a4540"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M50 51.4 Q54.4 56.4 58.4 52.6"
          fill="none"
          stroke="#4a4540"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        {/* whiskers, fanned out from the muzzle */}
        <path
          d="M37 47.5 Q30 45.5 25 43"
          fill="none"
          stroke="#4a4540"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.65"
        />
        <path
          d="M37 51 Q29.5 51 24 51.5"
          fill="none"
          stroke="#4a4540"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.65"
        />
        <path
          d="M63 47.5 Q70 45.5 75 43"
          fill="none"
          stroke="#4a4540"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.65"
        />
        <path
          d="M63 51 Q70.5 51 76 51.5"
          fill="none"
          stroke="#4a4540"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.65"
        />
      </svg>
    </div>
  );
}
