import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Breadcrumbs, type Crumb } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/site/json-ld";
import { EmptyState } from "@/components/site/listing/empty-state";
import { PostGrid } from "@/components/site/listing/post-grid";
import { countLabel, isRasterImageRef, truncateAtWord } from "@/components/site/listing/utils";
import { categoryBySlug } from "@/lib/constants";
import { getAuthorBySlug, listAuthorsWithPublished, listPublishedPosts } from "@/lib/posts";
import { authorPath, breadcrumbJsonLd, buildMetadata, categoryPath, jsonLdGraph, personJsonLd } from "@/lib/seo";
import { readStringArray } from "@/lib/validation";

export const revalidate = 3600;

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const authors = await listAuthorsWithPublished();
  return authors.map((a) => ({ slug: a.slug }));
}

/** One query per request, shared by generateMetadata and the page. */
const loadAuthor = cache((slug: string) => getAuthorBySlug(slug));

/**
 * True number of published posts by this author. getAuthorBySlug caps its
 * included posts at 50, so the count line must not be derived from that array.
 */
const loadPublishedTotal = cache(async (slug: string) => {
  const { total } = await listPublishedPosts({ authorSlug: slug, take: 1 });
  return total;
});

async function resolveAuthor(params: Promise<Params>) {
  const { slug } = await params;
  const author = await loadAuthor(slug);
  if (!author) notFound();
  return author;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const author = await resolveAuthor(params);
  // SVG avatars are not rendered by social crawlers; only a raster avatar can stand in
  // for the branded 1200x630 card that buildMetadata falls back to.
  const image = author.avatar && isRasterImageRef(author.avatar) ? author.avatar : undefined;
  return buildMetadata({
    title: `${author.name} — author`,
    description: truncateAtWord(author.bio, 160),
    path: authorPath(author.slug),
    image,
    // Authors without a published post are excluded from the sitemap and /about;
    // keep their page reachable but out of the index until the first post is live.
    noindex: author.posts.length === 0,
  });
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

const chipClass =
  "inline-flex min-h-11 items-center rounded-full bg-zinc-100 px-3.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900";

export default async function AuthorPage({ params }: { params: Promise<Params> }) {
  const author = await resolveAuthor(params);
  const categoryFocus = readStringArray(author.categoryFocus);
  const covers = categoryFocus.map((slug) => categoryBySlug(slug)).filter((c) => c !== undefined);
  const posts = author.posts;
  const total = await loadPublishedTotal(author.slug);

  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: author.name, path: authorPath(author.slug) },
  ];

  const jsonLd = jsonLdGraph(
    personJsonLd({ name: author.name, slug: author.slug, bio: author.bio, avatar: author.avatar, categoryFocus }),
    breadcrumbJsonLd(crumbs),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
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
            className="h-24 w-24 shrink-0 rounded-full bg-zinc-100 object-cover"
            // External avatar hosts are not in next.config images.remotePatterns; serve them as-is.
            unoptimized={/^https?:\/\//.test(author.avatar)}
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-2xl font-semibold text-zinc-700"
          >
            {initials(author.name)}
          </div>
        )}

        <div className="min-w-0 max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Author</p>
          <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight md:text-4xl">{author.name}</h1>
          <p className="mt-3 text-[17px] leading-7 text-zinc-600">{author.bio}</p>

          {covers.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-500">Covers:</span>
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

          <p className="mt-3 text-sm text-zinc-500">
            <span className="font-medium tabular-nums text-zinc-700">{countLabel(total, "published guide")}</span>
          </p>
        </div>
      </header>

      {posts.length === 0 ? (
        <EmptyState title={`${author.name} has no published guides yet`} className="mt-12">
          Guides appear here as soon as they are published. Every guide is checked against its sources first and is
          marked &ldquo;Verified: pending&rdquo; until an editor has tested it on a real build. In the meantime, browse
          the latest fixes from the rest of the team.
        </EmptyState>
      ) : (
        <section aria-labelledby="author-posts-heading" className="mt-12">
          <h2 id="author-posts-heading" className="text-2xl font-semibold tracking-tight">
            Guides by {author.name}
          </h2>
          {/* The eager avatar above is this page's one preloaded image; the grid stays lazy. */}
          <PostGrid posts={posts} className="mt-6" />
          {total > posts.length ? (
            <p className="mt-6 text-sm text-zinc-500">
              Showing the {posts.length.toLocaleString("en-US")} most recent guides. Older ones are listed in their
              category pages.
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}
