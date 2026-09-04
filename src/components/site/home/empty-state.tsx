import Link from "next/link";
import { CATEGORIES } from "@/lib/constants";
import { categoryPath } from "@/lib/seo";

/** Shown on the home page when nothing is PUBLISHED yet. Honest copy, no placeholder posts. */
export function HomeEmptyState() {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center">
      <p className="text-lg font-semibold text-zinc-900">Nothing published yet</p>
      <p className="mx-auto mt-2 max-w-xl text-zinc-600">
        New Windows update coverage and fixes appear here as soon as an editor approves them. Check back soon, or{" "}
        <a href="/feed.xml" className="font-medium text-blue-700 hover:underline">
          subscribe to the RSS feed
        </a>{" "}
        to be notified.
      </p>
      <nav aria-label="Browse categories" className="mt-6">
        <ul className="flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link
                href={categoryPath(c.slug)}
                className="inline-flex min-h-11 items-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:border-blue-600 hover:text-blue-700"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
