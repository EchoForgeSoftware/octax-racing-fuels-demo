export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="Octax Racing Fuels logo"
      fill="none"
    >
      <path
        d="M24 3.5 41.7 13.75v20.5L24 44.5 6.3 34.25v-20.5z"
        stroke="var(--color-brand)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M17 16 L26 24 L17 32 M31 16 L22 24 L31 32"
        stroke="var(--color-brand)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
