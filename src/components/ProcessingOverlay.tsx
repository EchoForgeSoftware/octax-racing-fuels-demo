"use client";

export function ProcessingOverlay({ durationMs, ozow = false }: { durationMs: number; ozow?: boolean }) {
  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed inset-0 z-[70] grid place-items-center bg-ink/95 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm text-center">
        <span
          className="mx-auto block h-14 w-14 rounded-full border-4 border-lime border-t-transparent animate-spin-slow"
          aria-hidden="true"
        />
        <p className="mt-7 font-display text-2xl uppercase text-paper">{ozow ? "Connecting to Ozow" : "Placing your order"}</p>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.16em] text-paper/50">
          {ozow ? "Preparing your secure payment" : "Preparing your EFT reference"} &middot; do not close this window
        </p>
        <div className="mt-7 h-2 w-full bg-paper/15">
          <div
            className="h-full bg-lime"
            style={{ animation: `fill ${durationMs}ms linear forwards` }}
          />
        </div>
      </div>
    </div>
  );
}
