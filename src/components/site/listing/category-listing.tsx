import { Breadcrumbs, type Crumb } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import type { PostCard } from "@/lib/posts";
import { absoluteUrl, breadcrumbJsonLd, categoryPath, jsonLdGraph } from "@/lib/seo";
import { EmptyState } from "./empty-state";
import { Pagination } from "./pagination";
import { PostGrid } from "./post-grid";
import { countLabel, listingPagePath, totalPagesFor } from "./utils";

type Category = { slug: string; name: string; description: string };

type Props = {
  category: Category;
  /** 1-based; page 1 renders at /[category], later pages at /[category]/page/[n]. */
  page: number;
  items: PostCard[];
  total: number;
};

/** <title> for a category listing; page ≥ 2 gets a "(page N)" suffix so titles stay unique. */
export function categoryListingTitle(category: Pick<Category, "name">, page: number): string {
  const base = `${category.name} — fixes and guides`;
  return page > 1 ? `${base} (page ${page})` : base;
}

/**
 * Shared body for /[category] and /[category]/page/[n]: breadcrumbs, header,
 * card grid, pagination and the CollectionPage + BreadcrumbList JSON-LD.
 */
export function CategoryListing({ category, page, items, total }: Props) {
  const totalPages = totalPagesFor(total);
  const basePath = categoryPath(category.slug);
  const path = listingPagePath(basePath, page);

  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: category.name, path: basePath },
  ];
  if (page > 1) crumbs.push({ name: `Page ${page}`, path });

  const jsonLd = jsonLdGraph(breadcrumbJsonLd(crumbs), {
    "@type": "CollectionPage",
    name: page > 1 ? `${category.name} (page ${page})` : category.name,
    description: category.description,
    url: absoluteUrl(path),
    inLanguage: "en",
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <JsonLd data={jsonLd} />
      <Breadcrumbs items={crumbs} />

      <header className="mt-4 max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">Category</p>
        <h1 className="font-display mt-1 text-3xl font-bold leading-tight tracking-tight md:text-4xl">{category.name}</h1>
        <p className="mt-3 text-lg leading-7 text-fg-body">{category.description}</p>
        <p className="mt-3 text-sm text-fg-muted">
          <span className="font-medium tabular-nums text-fg-body">{countLabel(total)}</span>
          {page > 1 ? <span className="tabular-nums"> · Page {page} of {totalPages}</span> : null}
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState title={`Nothing published in ${category.name} yet`} className="mt-12">
          Every guide is checked against its sources before it is published and is marked &ldquo;Verified:
          pending&rdquo; until an editor has tested it on a real build. This section fills up as new Windows updates
          ship &mdash; check back soon or browse what is already published.
        </EmptyState>
      ) : (
        <section aria-labelledby="listing-heading" className="mt-12">
          <h2 id="listing-heading" className="font-display text-2xl font-semibold tracking-tight">
            {page > 1 ? `Older guides, page ${page}` : "Latest guides"}
          </h2>
          <PostGrid posts={items} firstPriority={page === 1} className="mt-6" />
          <Pagination basePath={basePath} page={page} totalPages={totalPages} className="mt-10" />
        </section>
      )}
    </div>
  );
}
