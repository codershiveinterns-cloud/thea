import Link from "next/link";
import { CATEGORIES, SITE } from "@/lib/constants";
import { categoryPath } from "@/lib/seo";
import { ThemeToggle } from "./theme-toggle";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-fg" title="Home">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-display text-base font-bold text-accent-fg" aria-hidden="true">
        T
      </span>
      {SITE.name}
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-bg">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-bg focus:px-3 focus:py-2 focus:shadow">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Categories" className="hidden min-w-0 flex-1 justify-center lg:flex">
          <ul className="flex items-center gap-1">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link href={categoryPath(c.slug)} className="inline-flex h-10 items-center rounded-full px-3 text-sm font-medium text-fg-body transition-colors hover:bg-bg-2 hover:text-fg">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1">
          <Link href="/search" aria-label="Search" title="Search" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-bg-2 hover:text-fg">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </Link>
          <ThemeToggle />
        </div>
      </div>
      <nav aria-label="Categories" className="border-t border-line lg:hidden">
        <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 py-1 text-sm [scrollbar-width:none]">
          {CATEGORIES.map((c) => (
            <li key={c.slug} className="shrink-0">
              <Link href={categoryPath(c.slug)} className="inline-flex h-10 items-center rounded-full px-3 font-medium text-fg-body hover:bg-bg-2 hover:text-fg">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
