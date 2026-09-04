/**
 * /sitemap.xml — home, the five category pages, static pages, authors with published posts,
 * and every PUBLISHED post. All queries come from src/lib/posts.ts, so nothing unpublished
 * can leak into the index. Revalidated hourly and on every publish (revalidatePublicSite()).
 */
import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/constants";
import { allPublishedForIndex, categoryLastModified, listAuthorsWithPublished } from "@/lib/posts";
import { absoluteUrl, authorPath, categoryPath, featuredImageFor, postPath } from "@/lib/seo";

export const revalidate = 3600;

const STATIC_PAGES = ["/about", "/contact", "/editorial-policy"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categoryDates, authors] = await Promise.all([
    allPublishedForIndex(),
    categoryLastModified(),
    listAuthorsWithPublished(),
  ]);

  // Posts are ordered by publishedAt, so find the newest edit explicitly.
  let newest: Date | undefined;
  for (const p of posts) if (!newest || p.updatedAt > newest) newest = p.updatedAt;

  const home: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: newest, changeFrequency: "daily", priority: 1 },
  ];

  const categories: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: absoluteUrl(categoryPath(c.slug)),
    lastModified: categoryDates[c.slug] ?? undefined,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const statics: MetadataRoute.Sitemap = STATIC_PAGES.map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: "monthly",
    priority: 0.3,
  }));

  const authorPages: MetadataRoute.Sitemap = authors.map((a) => ({
    url: absoluteUrl(authorPath(a.slug)),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const postPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: absoluteUrl(postPath(p.category.slug, p.slug)),
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
    // Discover wants a ≥1200px image per article; featuredImageFor falls back to the branded OG card.
    images: [absoluteUrl(featuredImageFor(p))],
  }));

  return [...home, ...categories, ...statics, ...authorPages, ...postPages];
}
