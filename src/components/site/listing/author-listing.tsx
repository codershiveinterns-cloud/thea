import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs, type Crumb } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { categoryBySlug } from "@/lib/constants";
import type { PostCard } from "@/lib/posts";
import { authorPath, breadcrumbJsonLd, categoryPath, jsonLdGraph, personJsonLd } from "@/lib/seo";
import { readStringArray } from "@/lib/validation";
import { EmptyState } from "./empty-state";
import { Pagination } from "./pagination";
import { PostGrid } from "./post-grid";
import { countLabel, listingPagePath, totalPagesFor } from "./utils";

type Author = { name: string; slug: string; bio: string; avatar: string | null; categoryFocus: unknown };

type Props = {
  author: Author;
  /** 1-based; page 1 renders at /author/[slug], later pages at /author/[slug]/page/[n]. */
  page: number;
  items: PostCard[];
  total: number;
};

/** <title> for an author page; page ≥ 2 gets a "(page N)" suffix so titles stay unique. */
export function authorListingTitle(author: Pick<Author, "name">, page: number): string {
  const base = `${author.name} — author`;
  return page > 1 ? `${base} (page ${page})` : base;
}

/** Fallback when an author has no avatar: initials on a neutral disc (decorative). */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const chipClass = "inline-flex min-h-11 items-center rounded-full bg-bg-3 px-3.5 text-sm font-medium text-fg-body hover:bg-line hover:text-fg";

/** Shared body for /author/[slug] and /author/[slug]/page/[n]. */
export function AuthorListing({ author, page, items, total }: Props) {
  const categoryFocus = readStringArray(author.categoryFocus);
  const covers = categoryFocus.map((slug) => categoryBySlug(slug)).filter((c) => c !== undefined);
  const basePath = authorPath(author.slug);
  const path = listingPagePath(basePath, page);
  const totalPages = totalPagesFor(total);

  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: author.name, path: basePath },
  ];
  if (page > 1) crumbs.push({ name: `Page ${page}`, path });

  const jsonLd = jsonLdGraph(
    personJsonLd({ name: author.name, slug: author.slug, bio: author.bio, avatar: author.avatar, categoryFocus }),
    breadcrumbJsonLd(crumbs),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <JsonLd data={jsonLd} />
      <Breadcrumbs items={crumbs} />

      <header className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        {author.avatar ? (
          <Image
            src={author.avatar}
            alt={author.name}
            width={96}
            height={96}
            loading="eager"
            className="h-24 w-24 shrink-0 rounded-full bg-bg-3 object-cover"
            unoptimized={/^https?:\/\//.test(author.avatar)}
          />
        ) : (
          <div aria-hidden="true" className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-bg-3 font-display text-2xl font-semibold text-fg-body">
            {initials(author.name)}
          </div>
        )}

        <div className="min-w-0 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">Author</p>
          <h1 className="mt-1 font-display text-3xl font-bold leading-tight tracking-tight md:text-4xl">{author.name}</h1>
          <p className="mt-3 text-[17px] leading-7 text-fg-body">{author.bio}</p>

          {covers.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-fg-muted">Covers:</span>
              <ul role="list" className="flex flex-wrap gap-2">
                {covers.map((c) => (
                  <li key={c.slug}>
                    <Link href={categoryPath(c.slug)} className={chipClass}>
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="mt-3 text-sm text-fg-muted">
            <span className="font-medium tabular-nums text-fg-body">{countLabel(total, "published guide")}</span>
            {page > 1 ? <span className="tabular-nums"> · Page {page} of {totalPages}</span> : null}
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyState title={`${author.name} has no published guides yet`} className="mt-12">
          Guides appear here as soon as they are published. Every guide is checked against Microsoft&apos;s release notes before it goes
          live and re-checked when a new build ships.
        </EmptyState>
      ) : (
        <section aria-labelledby="author-posts-heading" className="mt-12">
          <h2 id="author-posts-heading" className="font-display text-2xl font-bold tracking-tight">
            {page > 1 ? `Older guides by ${author.name}, page ${page}` : `Guides by ${author.name}`}
          </h2>
          <PostGrid posts={items} className="mt-6" />
          <Pagination basePath={basePath} page={page} totalPages={totalPages} className="mt-10" />
        </section>
      )}
    </div>
  );
}
