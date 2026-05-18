export function HeronLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id={`heron-logo-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="55%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9" fill={`url(#heron-logo-${size})`} />
      <path
        d="M9 23 C 13 23, 14 19, 14 15 C 14 11, 16 9, 20 9 L 24 9 L 22 12 L 20 12 C 18 12, 17 13, 17 16 C 17 21, 14 24, 10 24 Z"
        fill="#fff"
        opacity=".95"
      />
      <circle cx="22.2" cy="10.5" r="1" fill="#0a0a14" />
    </svg>
  );
}
