import Link from "next/link";

export type Crumb = { name: string; path: string };

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="border-b-2 border-ink bg-paper">
      <ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted sm:px-6">
        {trail.map((c, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={c.path} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="text-ink">{c.name}</span>
              ) : (
                <>
                  <Link href={c.path} className="hover:text-flare">{c.name}</Link>
                  <span aria-hidden="true" className="text-lime">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
