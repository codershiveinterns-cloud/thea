import type { Metadata } from "next";
import Link from "next/link";
import { SearchForm } from "@/components/site/search-form";
import { CATEGORIES } from "@/lib/constants";
import { NOINDEX_ROBOTS, categoryPath } from "@/lib/seo";

// Rendered inside the (site) layout for notFound() calls in this group (unknown category/post/author slugs).
// URLs that match no route at all (e.g. /a/b/c) render src/app/not-found.tsx, which wraps this same
// component in the site chrome. No canonical: the 404 is served at whatever URL was requested.
export const metadata: Metadata = { title: "Page not found", robots: NOINDEX_ROBOTS };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-16">
      <p className="text-xs font-medium uppercase tracking-wide text-blue-700">404</p>
      <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight md:text-4xl">Page not found</h1>
      <p className="mt-4 leading-7 text-zinc-600">
        That page doesn’t exist or has moved — try searching for the error code or update you’re looking for.
      </p>
      <SearchForm className="mt-6" />

      <h2 className="mt-12 text-2xl font-semibold tracking-tight">Browse by category</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {CATEGORIES.map((c) => (
          <li key={c.slug}>
            <Link href={categoryPath(c.slug)} className="block h-full rounded-xl border border-zinc-200 p-4 hover:bg-zinc-50">
              <span className="block font-semibold text-zinc-900">{c.name}</span>
              <span className="mt-1 block text-sm leading-6 text-zinc-600">{c.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
