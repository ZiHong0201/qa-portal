export function CelebratingCat({ className }: { className?: string }) {
  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      <span
        className="animate-sparkle absolute -top-2 -left-2 text-yellow-400"
        style={{ animationDelay: "0s" }}
      >
        &#10022;
      </span>
      <span
        className="animate-sparkle absolute top-0 -right-3 text-yellow-400"
        style={{ animationDelay: "0.3s" }}
      >
        &#10022;
      </span>
      <span
        className="animate-sparkle absolute -top-4 left-1/2 -translate-x-1/2 text-yellow-400"
        style={{ animationDelay: "0.6s" }}
      >
        &#10022;
      </span>
      <svg viewBox="0 0 80 80" className="animate-cat-hop h-16 w-16" aria-hidden="true">
        {/* raised paws */}
        <path d="M16 46 Q6 34 10 20" fill="none" stroke="#8f8983" strokeWidth="8" strokeLinecap="round" />
        <circle cx="10" cy="19" r="5" fill="#fff" stroke="#4a4540" strokeWidth="1.5" />
        <path d="M64 46 Q74 34 70 20" fill="none" stroke="#8f8983" strokeWidth="8" strokeLinecap="round" />
        <circle cx="70" cy="19" r="5" fill="#fff" stroke="#4a4540" strokeWidth="1.5" />
        {/* body */}
        <ellipse cx="40" cy="54" rx="24" ry="20" fill="#8f8983" stroke="#4a4540" strokeWidth="2.2" />
        {/* belly */}
        <ellipse cx="40" cy="60" rx="14" ry="12" fill="#fff" />
        {/* ears */}
        <path d="M20 26 L14 8 L30 20 Z" fill="#8f8983" stroke="#4a4540" strokeWidth="2" strokeLinejoin="round" />
        <path d="M60 26 L66 8 L50 20 Z" fill="#8f8983" stroke="#4a4540" strokeWidth="2" strokeLinejoin="round" />
        <path d="M18 20 L15 12 L22 18 Z" fill="#d9b3ae" />
        <path d="M62 20 L65 12 L58 18 Z" fill="#d9b3ae" />
        {/* head */}
        <circle cx="40" cy="34" r="18" fill="#8f8983" stroke="#4a4540" strokeWidth="2.2" />
        {/* eyes */}
        <circle cx="33" cy="33" r="3.4" fill="#82b24c" />
        <circle cx="47" cy="33" r="3.4" fill="#82b24c" />
        <circle cx="34.2" cy="31.8" r="1" fill="#fff" />
        <circle cx="48.2" cy="31.8" r="1" fill="#fff" />
        {/* blush */}
        <ellipse cx="26" cy="40" rx="3.2" ry="2.2" fill="#f3b6c4" opacity="0.7" />
        <ellipse cx="54" cy="40" rx="3.2" ry="2.2" fill="#f3b6c4" opacity="0.7" />
        {/* cheering open mouth */}
        <path d="M34 41 Q40 49 46 41 Q40 45 34 41 Z" fill="#4a4540" />
      </svg>
    </div>
  );
}
