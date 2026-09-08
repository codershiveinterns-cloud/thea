import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { PostCard } from "@/components/site/post-card";
import { SearchForm } from "@/components/site/search-form";
import { CATEGORIES, SITE } from "@/lib/constants";
import { searchPublishedPosts } from "@/lib/posts";
import { buildMetadata, categoryPath } from "@/lib/seo";

const QUERY_MIN = 2;
const QUERY_MAX = 100;
const RESULTS_MAX = 20;

// Results pages must never be indexed; the page is dynamic because it reads searchParams.
export const metadata: Metadata = buildMetadata({
  title: "Search",
  description: `Search ${SITE.name} for Windows update coverage, error-code fixes and how-to guides.`,
  path: "/search",
  noindex: true,
});

const querySchema = z.string().trim().max(QUERY_MAX);

/** `q` may be repeated (?q=a&q=b); the first value wins. Over-long input is dropped rather than truncated. */
function readQuery(raw: string | string[] | undefined): { q: string; tooLong: boolean } {
  const parsed = querySchema.safeParse((Array.isArray(raw) ? raw[0] : raw) ?? "");
  return parsed.success ? { q: parsed.data, tooLong: false } : { q: "", tooLong: true };
}

/**
 * Prisma `contains` compiles to LIKE with no ESCAPE clause, so `%` (and `\` once on Postgres) would act as
 * wildcards and `?q=%%` would list every post. `_` is kept because Windows stop-code names contain it; as a
 * single-character wildcard it can only over-match slightly, so it simply does not count towards the minimum.
 */
function toSearchTerm(q: string): string {
  return q.replace(/[%\\]/g, " ").replace(/\s+/g, " ").trim();
}

function meaningfulLength(term: string): number {
  return term.replace(/[_\s]/g, "").length;
}

function CategoryLinks() {
  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {CATEGORIES.map((c) => (
        <li key={c.slug}>
          <Link
            href={categoryPath(c.slug)}
            className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium text-fg-body hover:bg-bg-2"
          >
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q, tooLong } = readQuery((await searchParams).q);
  // The form keeps what was typed (q); the query and headings use the wildcard-free term.
  const term = toSearchTerm(q);
  const searched = meaningfulLength(term) >= QUERY_MIN;
  const results = searched ? await searchPublishedPosts(term, RESULTS_MAX) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-bold leading-tight tracking-tight md:text-4xl">Search {SITE.name}</h1>
      <p className="mt-2 leading-7 text-fg-body">Searches the title and quick answer of every published article.</p>
      <SearchForm defaultValue={q} className="mt-6" />
      {tooLong ? (
        <p className="mt-3 text-sm text-amber-800">Search terms are limited to {QUERY_MAX} characters — try a shorter phrase, such as just the error code.</p>
      ) : null}
      {!tooLong && q.length > 0 && !searched ? (
        <p className="mt-3 text-sm text-amber-800">Type at least {QUERY_MIN} letters or numbers to search.</p>
      ) : null}

      <section className="mt-10" aria-labelledby="results-heading">
        {searched && results.length > 0 ? (
          <>
            {/* break-words: an unbroken query (a long error string) must wrap rather than overflow the viewport on mobile. */}
            <h2 id="results-heading" className="font-display break-words text-2xl font-semibold tracking-tight">
              {results.length} {results.length === 1 ? "result" : "results"} for “{term}”
            </h2>
            {results.length === RESULTS_MAX ? (
              <p className="mt-1 text-sm text-fg-body">Showing the {RESULTS_MAX} most recent matches — add a word to narrow it down.</p>
            ) : null}
            <ul className="mt-4 divide-y divide-line rounded-xl border border-line px-4">
              {results.map((post) => (
                <li key={post.id}>
                  <PostCard post={post} variant="compact" />
                </li>
              ))}
            </ul>
          </>
        ) : searched ? (
          <>
            <h2 id="results-heading" className="font-display break-words text-2xl font-semibold tracking-tight">
              No results for “{term}”
            </h2>
            <p className="mt-2 leading-7 text-fg-body">
              Try a shorter phrase — the error code on its own, or the KB number of the update — or browse a category:
            </p>
            <CategoryLinks />
          </>
        ) : (
          <>
            <h2 id="results-heading" className="font-display text-2xl font-semibold tracking-tight">
              Browse by category
            </h2>
            <p className="mt-2 leading-7 text-fg-body">Not sure what to search for? Every article is filed under one of these.</p>
            <CategoryLinks />
          </>
        )}
      </section>
    </div>
  );
}
