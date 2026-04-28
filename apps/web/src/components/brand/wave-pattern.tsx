/**
 * Decorative SVG wave pattern — used as the auth hero backdrop.
 * Pure CSS-position-able decoration, never interactive.
 */
export function WavePattern({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="waveFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Concentric rings — radar / port radial */}
      <g stroke="currentColor" strokeWidth="0.6" opacity="0.18" fill="none">
        <circle cx="700" cy="120" r="60" />
        <circle cx="700" cy="120" r="120" />
        <circle cx="700" cy="120" r="200" />
        <circle cx="700" cy="120" r="320" />
      </g>

      {/* Stacked sine waves */}
      <g stroke="currentColor" fill="none">
        <path
          d="M -50 380 Q 100 340 250 380 T 550 380 T 850 380"
          strokeWidth="1"
          opacity="0.25"
        />
        <path
          d="M -50 430 Q 120 390 270 430 T 570 430 T 870 430"
          strokeWidth="1"
          opacity="0.18"
        />
        <path
          d="M -50 480 Q 140 440 290 480 T 590 480 T 890 480"
          strokeWidth="1"
          opacity="0.13"
        />
      </g>

      {/* Filled wave at the bottom — like a horizon */}
      <path
        d="M -50 540 Q 100 500 250 540 T 550 540 T 850 540 L 850 600 L -50 600 Z"
        fill="url(#waveFade)"
      />

      {/* Hairline grid in upper-left — admiralty chart feel */}
      <g stroke="currentColor" strokeWidth="0.4" opacity="0.08">
        <line x1="0" y1="80" x2="800" y2="80" />
        <line x1="0" y1="160" x2="800" y2="160" />
        <line x1="0" y1="240" x2="800" y2="240" />
        <line x1="80" y1="0" x2="80" y2="600" />
        <line x1="160" y1="0" x2="160" y2="600" />
        <line x1="240" y1="0" x2="240" y2="600" />
      </g>
    </svg>
  );
}
