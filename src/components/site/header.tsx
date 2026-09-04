import Link from "next/link";
import { CATEGORIES, SITE } from "@/lib/constants";
import { categoryPath } from "@/lib/seo";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow">
        Skip to content
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900" title="Home">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-sm font-black text-white" aria-hidden="true">
            F
          </span>
          {SITE.name}
        </Link>
        <Link href="/search" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
          Search
        </Link>
      </div>
      <nav aria-label="Categories" className="border-t border-zinc-100">
        <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 text-sm">
          {CATEGORIES.map((c) => (
            <li key={c.slug} className="shrink-0">
              <Link href={categoryPath(c.slug)} className="block px-2 py-2.5 font-medium text-zinc-700 hover:text-blue-700">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
