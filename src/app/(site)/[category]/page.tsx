import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryListing, categoryListingTitle } from "@/components/site/listing/category-listing";
import { LISTING_PAGE_SIZE, findCategory } from "@/components/site/listing/utils";
import { CATEGORY_SLUGS } from "@/lib/constants";
import { listPublishedPosts } from "@/lib/posts";
import { buildMetadata, categoryPath } from "@/lib/seo";

export const revalidate = 3600;

type Params = { category: string };

export function generateStaticParams(): Params[] {
  return CATEGORY_SLUGS.map((category) => ({ category }));
}

/** Unknown slugs (including stray asset requests like /favicon.png) are a 404. */
function resolveCategory(slug: string) {
  const category = findCategory(slug);
  if (!category) notFound();
  return category;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { category: slug } = await params;
  const category = resolveCategory(slug);
  return buildMetadata({
    title: categoryListingTitle(category, 1),
    description: category.description,
    path: categoryPath(category.slug),
  });
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { category: slug } = await params;
  const category = resolveCategory(slug);
  const { items, total } = await listPublishedPosts({ categorySlug: category.slug, take: LISTING_PAGE_SIZE, skip: 0 });
  return <CategoryListing category={category} page={1} items={items} total={total} />;
}
