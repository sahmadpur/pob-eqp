/**
 * Port of Baku crest — compass-rose with anchor center.
 * Shared brand mark used in auth hero, portal navs, and headers.
 */
export function Crest({ className = 'w-10 h-10', strokeWidth = 1.25 }: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx="32" cy="32" r="29" opacity="0.4" />
      <circle cx="32" cy="32" r="25" />

      {/* Compass cardinal points */}
      <path d="M32 7 L34 30 L32 32 L30 30 Z" fill="currentColor" />
      <path d="M32 57 L34 34 L32 32 L30 34 Z" opacity="0.5" />
      <path d="M7 32 L30 34 L32 32 L30 30 Z" opacity="0.5" />
      <path d="M57 32 L34 34 L32 32 L34 30 Z" opacity="0.5" />

      {/* Diagonal markers — short ticks */}
      <path d="M14.4 14.4 L18.5 18.5" opacity="0.35" />
      <path d="M49.6 14.4 L45.5 18.5" opacity="0.35" />
      <path d="M14.4 49.6 L18.5 45.5" opacity="0.35" />
      <path d="M49.6 49.6 L45.5 45.5" opacity="0.35" />

      {/* Anchor at center */}
      <circle cx="32" cy="26" r="2" />
      <path d="M32 28 L32 42" />
      <path d="M28 32 L36 32" />
      <path d="M24 38 C 24 42, 28 44, 32 44 C 36 44, 40 42, 40 38" />
    </svg>
  );
}

/** Wordmark — Fraunces serif, two-line lockup. */
export function Wordmark({ className = '', tone = 'light' }: {
  className?: string;
  tone?: 'light' | 'dark';
}) {
  const primary = tone === 'light' ? 'text-parchment-50' : 'text-ink-800';
  const secondary = tone === 'light' ? 'text-brass-300' : 'text-brass-600';
  return (
    <div className={className}>
      <p className={`font-display text-xl leading-none tracking-tight ${primary}`}>
        Port of Baku
      </p>
      <p className={`mt-1 text-[10px] uppercase tracking-eyebrow font-medium ${secondary}`}>
        E-Queue Platform
      </p>
    </div>
  );
}
