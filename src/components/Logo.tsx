export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="Octax Racing Fuels logo" fill="none">
      <rect x="1.5" y="1.5" width="45" height="45" rx="3" fill="var(--color-lime)" stroke="var(--color-ink)" strokeWidth="2.5" />
      <path
        d="M16 15 L25 24 L16 33 M32 15 L23 24 L32 33"
        stroke="var(--color-ink)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
