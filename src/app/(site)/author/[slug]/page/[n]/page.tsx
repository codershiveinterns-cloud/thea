import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AuthorListing, authorListingTitle } from "@/components/site/listing/author-listing";
import { LISTING_PAGE_SIZE, listingPagePath, parsePageNumber, totalPagesFor, truncateAtWord } from "@/components/site/listing/utils";
import { getAuthorBySlug, listAuthorsWithPublished, listPublishedPosts } from "@/lib/posts";
import { authorPath, buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

type Params = { slug: string; n: string };

/** Pages 2..N for every author with more than one page of published posts. */
export async function generateStaticParams(): Promise<Params[]> {
  const authors = await listAuthorsWithPublished();
  const perAuthor = await Promise.all(
    authors.map(async (a) => {
      const { total } = await listPublishedPosts({ authorSlug: a.slug, take: 1 });
      const out: Params[] = [];
      for (let n = 2; n <= totalPagesFor(total); n++) out.push({ slug: a.slug, n: String(n) });
      return out;
    }),
  );
  return perAuthor.flat();
}

const loadAuthor = cache((slug: string) => getAuthorBySlug(slug));
const loadPage = cache((slug: string, page: number) => listPublishedPosts({ authorSlug: slug, take: LISTING_PAGE_SIZE, skip: (page - 1) * LISTING_PAGE_SIZE }));

/** Unknown author, non-integer n, n < 2 or n past the last page → 404 (page 1 lives at /author/[slug]). */
async function resolve(params: Promise<Params>) {
  const { slug, n: raw } = await params;
  const author = await loadAuthor(slug);
  if (!author) notFound();
  const page = parsePageNumber(raw);
  if (page === null) notFound();
  const { items, total } = await loadPage(slug, page);
  if (page > totalPagesFor(total)) notFound();
  return { author, page, items, total };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { author, page } = await resolve(params);
  return buildMetadata({ title: authorListingTitle(author, page), description: truncateAtWord(author.bio, 160), path: listingPagePath(authorPath(author.slug), page) });
}

export default async function AuthorPageN({ params }: { params: Promise<Params> }) {
  const { author, page, items, total } = await resolve(params);
  return <AuthorListing author={author} page={page} items={items} total={total} />;
}
