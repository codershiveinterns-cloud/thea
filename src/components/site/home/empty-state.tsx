import Link from "next/link";
import { CATEGORIES } from "@/lib/constants";
import { categoryPath } from "@/lib/seo";

/** Shown on the home page when nothing is PUBLISHED yet. Honest copy, no placeholder posts. */
export function HomeEmptyState() {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-line bg-bg-2 px-6 py-10 text-center">
      <p className="text-lg font-semibold text-fg">Nothing published yet</p>
      <p className="mx-auto mt-2 max-w-xl text-fg-body">
        New Windows update coverage and fixes appear here as soon as an editor approves them. Check back soon, or{" "}
        <a href="/feed.xml" className="font-medium text-accent hover:underline">
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
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-bg px-4 text-sm font-medium text-fg-body hover:border-accent hover:text-accent"
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
