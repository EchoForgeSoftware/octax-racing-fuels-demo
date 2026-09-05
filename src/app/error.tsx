"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Detail goes to the console; the user sees a clean message.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <p className="animate-pop font-display text-[clamp(3rem,12vw,7rem)] leading-none text-flare">
        Oops
      </p>
      <h1 className="mt-4 font-display text-2xl uppercase">Something went wrong</h1>
      <p className="mt-3 max-w-md text-ink-soft">
        An unexpected error occurred on this page. You can try again, or head back to the
        store.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="border-2 border-ink bg-flare px-6 py-3.5 font-display uppercase text-paper transition-colors hover:bg-ink"
        >
          Try again
        </button>
        <Link
          href="/"
          className="border-2 border-ink px-6 py-3.5 font-display uppercase text-ink transition-colors hover:bg-ink hover:text-lime"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
