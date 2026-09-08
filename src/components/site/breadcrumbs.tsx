import Link from "next/link";

export type Crumb = { name: string; path: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs font-medium text-fg-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.path} className="flex min-w-0 items-center gap-1.5">
              {i > 0 ? (
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3 w-3 shrink-0 text-line" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m7.5 5 5 5-5 5" />
                </svg>
              ) : null}
              {last ? (
                <span aria-current="page" className="truncate text-fg-body">
                  {item.name}
                </span>
              ) : (
                <Link href={item.path} className="hover:text-accent">
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
