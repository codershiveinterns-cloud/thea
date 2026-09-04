/**
 * SEO helpers: canonical URLs, Metadata builders and JSON-LD generators.
 * Everything the public site emits for search engines goes through here.
 */
import type { Metadata } from "next";
import { SITE, categoryBySlug } from "./constants";
import type { FaqItem } from "./validation";

// ---------- URLs ----------

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export const categoryPath = (categorySlug: string) => `/${categorySlug}`;
export const postPath = (categorySlug: string, slug: string) => `/${categorySlug}/${slug}`;
export const authorPath = (slug: string) => `/author/${slug}`;

/** Branded 1200x630 image rendered by /api/og. Used as the fallback featured image. */
export function ogImagePath(title: string, categorySlug?: string): string {
  const params = new URLSearchParams({ title: title.slice(0, 140) });
  if (categorySlug) params.set("category", categorySlug);
  return `/api/og?${params.toString()}`;
}

export function featuredImageFor(post: { title: string; featuredImage: string | null; category: { slug: string } }): string {
  return post.featuredImage || ogImagePath(post.title, post.category.slug);
}

// ---------- Metadata ----------

export const DEFAULT_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

export const NOINDEX_ROBOTS: NonNullable<Metadata["robots"]> = { index: false, follow: true };

type PageMeta = {
  title: string;
  description: string;
  path: string;
  /** Absolute or site-relative image; defaults to the branded OG image for the title */
  image?: string;
  type?: "website" | "article";
  publishedTime?: Date | null;
  modifiedTime?: Date | null;
  authors?: string[];
  noindex?: boolean;
};

export function buildMetadata(meta: PageMeta): Metadata {
  const url = absoluteUrl(meta.path);
  const image = absoluteUrl(meta.image ?? ogImagePath(meta.title));
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: url, types: { "application/rss+xml": [{ url: absoluteUrl("/feed.xml"), title: `${SITE.name} RSS feed` }] } },
    robots: meta.noindex ? NOINDEX_ROBOTS : DEFAULT_ROBOTS,
    openGraph: {
      type: meta.type ?? "website",
      url,
      siteName: SITE.name,
      title: meta.title,
      description: meta.description,
      locale: "en_US",
      images: [{ url: image, width: 1200, height: 630, alt: meta.title }],
      ...(meta.type === "article"
        ? {
            publishedTime: meta.publishedTime?.toISOString(),
            modifiedTime: meta.modifiedTime?.toISOString(),
            authors: meta.authors,
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [image],
    },
  };
}

// ---------- JSON-LD ----------

export type JsonLd = Record<string, unknown>;

const ORG_ID = `${SITE.url}/#organization`;
const SITE_ID = `${SITE.url}/#website`;

export function organizationJsonLd(): JsonLd {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE.name,
    url: SITE.url,
    logo: { "@type": "ImageObject", url: absoluteUrl("/icon.png"), width: 512, height: 512 },
  };
}

export function websiteJsonLd(): JsonLd {
  return {
    "@type": "WebSite",
    "@id": SITE_ID,
    url: SITE.url,
    name: SITE.name,
    description: SITE.tagline,
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export type ArticleJsonLdInput = {
  title: string;
  description: string;
  path: string;
  image: string;
  publishedAt: Date | null;
  updatedAt: Date;
  author: { name: string; slug: string };
  categoryName: string;
  wordCount?: number;
};

export function articleJsonLd(p: ArticleJsonLdInput): JsonLd {
  const url = absoluteUrl(p.path);
  return {
    "@type": "TechArticle",
    "@id": `${url}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: p.title.slice(0, 110),
    description: p.description,
    image: [absoluteUrl(p.image)],
    datePublished: (p.publishedAt ?? p.updatedAt).toISOString(),
    dateModified: p.updatedAt.toISOString(),
    author: { "@type": "Person", "@id": `${absoluteUrl(authorPath(p.author.slug))}#person`, name: p.author.name, url: absoluteUrl(authorPath(p.author.slug)) },
    publisher: { "@id": ORG_ID },
    articleSection: p.categoryName,
    inLanguage: "en",
    isAccessibleForFree: true,
    ...(p.wordCount ? { wordCount: p.wordCount } : {}),
  };
}

export function faqJsonLd(faq: FaqItem[]): JsonLd | null {
  if (faq.length === 0) return null;
  return {
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function personJsonLd(author: { name: string; slug: string; bio: string; avatar: string | null; categoryFocus: string[] }): JsonLd {
  const url = absoluteUrl(authorPath(author.slug));
  return {
    "@type": "Person",
    "@id": `${url}#person`,
    name: author.name,
    url,
    description: author.bio,
    ...(author.avatar ? { image: absoluteUrl(author.avatar) } : {}),
    worksFor: { "@id": ORG_ID },
    knowsAbout: author.categoryFocus.map((slug) => categoryBySlug(slug)?.name ?? slug),
  };
}

/** Wrap one or more entities in a single @graph document. */
export function jsonLdGraph(...entities: (JsonLd | null | undefined)[]): JsonLd {
  return { "@context": "https://schema.org", "@graph": entities.filter(Boolean) };
}

/** Serialise for a <script type="application/ld+json"> — escapes "<" so it can't break out of the tag. */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
