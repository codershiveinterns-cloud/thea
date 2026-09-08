import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AuthorListing } from "@/components/site/listing/author-listing";
import { LISTING_PAGE_SIZE, isRasterImageRef, truncateAtWord } from "@/components/site/listing/utils";
import { getAuthorBySlug, listAuthorsWithPublished, listPublishedPosts } from "@/lib/posts";
import { authorPath, buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const authors = await listAuthorsWithPublished();
  return authors.map((a) => ({ slug: a.slug }));
}

/** One query per request, shared by generateMetadata and the page. */
const loadAuthor = cache((slug: string) => getAuthorBySlug(slug));

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

export default async function AuthorPage({ params }: { params: Promise<Params> }) {
  const author = await resolveAuthor(params);
  const { items, total } = await listPublishedPosts({ authorSlug: author.slug, take: LISTING_PAGE_SIZE });
  return <AuthorListing author={author} page={1} items={items} total={total} />;
}
