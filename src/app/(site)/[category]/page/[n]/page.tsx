import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CategoryListing, categoryListingTitle } from "@/components/site/listing/category-listing";
import { LISTING_PAGE_SIZE, findCategory, listingPagePath, parsePageNumber, totalPagesFor } from "@/components/site/listing/utils";
import { CATEGORY_SLUGS } from "@/lib/constants";
import { listPublishedPosts } from "@/lib/posts";
import { buildMetadata, categoryPath } from "@/lib/seo";

export const revalidate = 3600;

type Params = { category: string; n: string };

/** Pages 2..N for every category that currently has more than one page of published posts. */
export async function generateStaticParams(): Promise<Params[]> {
  const perCategory = await Promise.all(
    CATEGORY_SLUGS.map(async (category) => {
      const { total } = await listPublishedPosts({ categorySlug: category, take: 1 });
      const pages = totalPagesFor(total);
      const out: Params[] = [];
      for (let n = 2; n <= pages; n++) out.push({ category, n: String(n) });
      return out;
    }),
  );
  return perCategory.flat();
}

/** One query per request, shared by generateMetadata and the page. */
const loadPage = cache((categorySlug: string, page: number) =>
  listPublishedPosts({ categorySlug, take: LISTING_PAGE_SIZE, skip: (page - 1) * LISTING_PAGE_SIZE }),
);

/**
 * Validates both segments and loads the page. Unknown category, non-integer n,
 * n < 2, or n past the last page → 404 (page 1 is only ever served at /[category]).
 */
async function resolve(params: Promise<Params>) {
  const { category: slug, n: raw } = await params;
  const category = findCategory(slug);
  if (!category) notFound();
  const page = parsePageNumber(raw);
  if (page === null) notFound();
  const { items, total } = await loadPage(category.slug, page);
  if (page > totalPagesFor(total)) notFound();
  return { category, page, items, total };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { category, page } = await resolve(params);
  return buildMetadata({
    title: categoryListingTitle(category, page),
    description: category.description,
    path: listingPagePath(categoryPath(category.slug), page),
  });
}

export default async function CategoryPageN({ params }: { params: Promise<Params> }) {
  const { category, page, items, total } = await resolve(params);
  return <CategoryListing category={category} page={page} items={items} total={total} />;
}
