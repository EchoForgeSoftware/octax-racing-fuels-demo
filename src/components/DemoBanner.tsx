export function DemoBanner() {
  return (
    <div className="flex items-center justify-center gap-3 bg-ink px-4 py-1.5 text-center">
      <span
        className="hidden h-2 w-8 shrink-0 sm:block"
        style={{ backgroundImage: "repeating-linear-gradient(-45deg, var(--color-lime) 0 5px, transparent 5px 10px)" }}
        aria-hidden="true"
      />
      <span className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.16em] text-lime">
        Demo build · sample products, prices &amp; stock · no real orders
      </span>
      <span
        className="hidden h-2 w-8 shrink-0 sm:block"
        style={{ backgroundImage: "repeating-linear-gradient(-45deg, var(--color-lime) 0 5px, transparent 5px 10px)" }}
        aria-hidden="true"
      />
    </div>
  );
}
