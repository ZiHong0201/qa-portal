export function RunningCat({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
      <g transform="translate(100,0) scale(-1,1)">
      {/* tail */}
      <path
        d="M68 32 Q90 14 80 4 Q73 -1 73 8 Q73 17 64 24"
        fill="none"
        stroke="#726b64"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path d="M73 4 Q78 1 81 5" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />

      {/* far legs (behind body, slightly darker) */}
      <path d="M30 42 Q25 51 18 55" fill="none" stroke="#7a746e" strokeWidth="6" strokeLinecap="round" />
      <path d="M60 42 Q65 51 71 54" fill="none" stroke="#7a746e" strokeWidth="6" strokeLinecap="round" />

      {/* body */}
      <path
        d="M18 38 Q15 20 36 18 Q58 16 70 25 Q78 30 73 38 Q67 47 48 45 Q28 47 18 38 Z"
        fill="#8f8983"
        stroke="#4a4540"
        strokeWidth="2.2"
      />
      {/* belly patch */}
      <path d="M26 39 Q38 48 56 41 Q50 46 38 46.5 Q29 46.5 26 39 Z" fill="#ffffff" />

      {/* near legs with white paws */}
      <path d="M34 43 Q29 53 20 57" fill="none" stroke="#8f8983" strokeWidth="7.5" strokeLinecap="round" />
      <circle cx="19" cy="57" r="4.3" fill="#fff" />
      <path d="M57 43 Q63 53 70 58" fill="none" stroke="#8f8983" strokeWidth="7.5" strokeLinecap="round" />
      <circle cx="71" cy="58" r="4.3" fill="#fff" />

      {/* head */}
      <circle cx="17" cy="23" r="15" fill="#8f8983" stroke="#4a4540" strokeWidth="2.2" />
      {/* ears */}
      <path d="M6 13 L4 2 L15 11 Z" fill="#8f8983" stroke="#4a4540" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M20 9 L25 -1 L29 10 Z" fill="#8f8983" stroke="#4a4540" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M8 9 L7 3 L12 9 Z" fill="#d9b3ae" />
      <path d="M22 7 L25 2 L27 8 Z" fill="#d9b3ae" />

      {/* eye */}
      <circle cx="13" cy="23" r="2.8" fill="#82b24c" />
      <circle cx="12.1" cy="22" r="0.9" fill="#fff" />
      {/* nose + mouth */}
      <path d="M6 27 Q4.5 29 6.5 30.5" fill="none" stroke="#4a4540" strokeWidth="1.4" strokeLinecap="round" />
      {/* cheek blush */}
      <circle cx="9" cy="28" r="2" fill="#f3b6c4" opacity="0.6" />
      </g>
    </svg>
  );
}
