/**
 * Shared helpers for the public listing pages (category + author).
 * Pure functions only — no DB access here.
 */
import { CATEGORY_SLUGS, categoryBySlug } from "@/lib/constants";

/** Posts per page on /[category] and /[category]/page/[n]. */
export const LISTING_PAGE_SIZE = 12;

/** Page 1 lives at the base path; later pages at /base/page/N. */
export function listingPagePath(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}/page/${page}`;
}

export function totalPagesFor(total: number, pageSize = LISTING_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * Category lookup that only accepts the fixed public slugs. Anything else
 * (e.g. /favicon.png hitting the [category] segment) returns undefined → notFound().
 */
export function findCategory(slug: string) {
  if (!(CATEGORY_SLUGS as string[]).includes(slug)) return undefined;
  return categoryBySlug(slug);
}

/**
 * Parses the [n] segment of /[category]/page/[n]. Accepts plain positive
 * integers ≥ 2 without leading zeros or sign; everything else is null → notFound().
 * Page 1 is never served here — its canonical home is /[category].
 */
export function parsePageNumber(raw: string): number | null {
  if (!/^[1-9]\d{0,5}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 2 ? n : null;
}

/** "1 guide" / "12 guides" */
export function countLabel(n: number, noun = "guide"): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? noun : `${noun}s`}`;
}

/**
 * Shortens `text` to at most `max` characters for a meta description, cutting at
 * a word boundary and appending "…" when something was removed. Never splits a word
 * unless the first word alone is longer than half the budget.
 */
export function truncateAtWord(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  let cut = clean.slice(0, max - 1); // leave room for the ellipsis
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace >= Math.floor(max / 2)) cut = cut.slice(0, lastSpace);
  return `${cut.replace(/[\s,;:.!?\-–—]+$/, "")}…`;
}

/**
 * True when an image ref points at a raster format social crawlers can render
 * (PNG/JPEG/WebP/GIF/AVIF). SVGs and extension-less refs are not usable as an
 * og:image, so callers should fall back to the branded /api/og card instead.
 */
export function isRasterImageRef(ref: string): boolean {
  const path = ref.split(/[?#]/, 1)[0] ?? "";
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(path);
}
