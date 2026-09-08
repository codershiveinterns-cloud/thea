/** Sitemap entries for /sitemap.xml: home, categories, static pages, authors with posts, every published post. */
import { CATEGORIES } from "@/lib/constants";
import { allPublishedForIndex, categoryLastModified, listAuthorsWithPublished } from "@/lib/posts";
import { absoluteUrl, authorPath, categoryPath, featuredImageFor, postPath } from "@/lib/seo";
import type { SitemapEntry } from "@/lib/xml";

const STATIC_PAGES = ["/about", "/contact", "/editorial-policy"] as const;

export async function sitemapEntries(): Promise<SitemapEntry[]> {
  const [posts, categoryDates, authors] = await Promise.all([allPublishedForIndex(), categoryLastModified(), listAuthorsWithPublished()]);

  let newest: Date | undefined;
  for (const p of posts) if (!newest || p.updatedAt > newest) newest = p.updatedAt;

  return [
    { url: absoluteUrl("/"), lastModified: newest, changeFrequency: "daily", priority: 1 },
    // Categories with no published post are noindex and left out until they have content.
    ...CATEGORIES.filter((c) => categoryDates[c.slug]).map<SitemapEntry>((c) => ({ url: absoluteUrl(categoryPath(c.slug)), lastModified: categoryDates[c.slug] ?? undefined, changeFrequency: "weekly", priority: 0.8 })),
    ...STATIC_PAGES.map<SitemapEntry>((path) => ({ url: absoluteUrl(path), changeFrequency: "monthly", priority: 0.3 })),
    ...authors.map<SitemapEntry>((a) => ({ url: absoluteUrl(authorPath(a.slug)), changeFrequency: "monthly", priority: 0.5 })),
    ...posts.map<SitemapEntry>((p) => ({
      url: absoluteUrl(postPath(p.category.slug, p.slug)),
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
      // Discover wants a ≥1200px image per article; featuredImageFor falls back to the branded OG card.
      images: [absoluteUrl(featuredImageFor(p))],
    })),
  ];
}

