export function CatWink({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {/* ears */}
      <path d="M14 22 L20 6 L28 20 Z" fill="#8f8983" stroke="#4a4540" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M50 22 L44 6 L36 20 Z" fill="#8f8983" stroke="#4a4540" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M17 19 L20 11 L24 18 Z" fill="#d9b3ae" />
      <path d="M47 19 L44 11 L40 18 Z" fill="#d9b3ae" />
      {/* face */}
      <circle cx="32" cy="34" r="20" fill="#8f8983" stroke="#4a4540" strokeWidth="1.5" />
      <ellipse cx="32" cy="42" rx="11" ry="8" fill="#ffffff" />
      {/* open eye */}
      <circle cx="40" cy="33" r="3.4" fill="#82b24c" />
      <circle cx="41.2" cy="31.8" r="1" fill="#fff" />
      {/* winking eye */}
      <path d="M20.5 33 Q24 30 27.5 33" fill="none" stroke="#4a4540" strokeWidth="1.6" strokeLinecap="round" />
      {/* blush */}
      <ellipse cx="18" cy="39" rx="3" ry="2" fill="#f3b6c4" opacity="0.7" />
      <ellipse cx="46" cy="39" rx="3" ry="2" fill="#f3b6c4" opacity="0.7" />
      {/* nose + happy open mouth */}
      <path d="M30.5 39 L33.5 39 L32 41 Z" fill="#4a4540" />
      <path d="M28 42 Q32 47 36 42" fill="none" stroke="#4a4540" strokeWidth="1.4" strokeLinecap="round" />
      {/* whiskers */}
      <path d="M8 32 L18 33" stroke="#4a4540" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8 37 L18 36" stroke="#4a4540" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M56 32 L46 33" stroke="#4a4540" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M56 37 L46 36" stroke="#4a4540" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
