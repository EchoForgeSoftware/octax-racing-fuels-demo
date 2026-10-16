// Small stroke icon set shared by the cart controls, in the same 24px grid and
// square-capped weight as the nav and back-to-top icons.
const paths = {
  minus: "M5 12h14",
  plus: "M12 5v14M5 12h14",
  check: "M20 6 9 17l-5-5",
  close: "M6 6l12 12M6 18L18 6",
  arrow: "M5 12h14M13 6l6 6-6 6",
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 16,
  strokeWidth = 3,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
