/**
 * XML helpers shared by /sitemap.xml and /feed.xml. Every text node and URL that lands in
 * XML goes through xmlEscape(): & < > " ' become entities and characters illegal in XML 1.0
 * are dropped. Query-string URLs (…&category=…) are the usual culprit.
 */

export function xmlEscape(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case "&":
          return "&amp;";
        case "'":
          return "&apos;";
        default:
          return "&quot;";
      }
    });
}

export type SitemapEntry = {
  url: string;
  lastModified?: Date | null;
  changeFrequency?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
  /** Absolute image URLs (sitemap-image extension). */
  images?: string[];
};

/** Build a sitemap document. Pure — testable with any XML parser. */
export function buildSitemapXml(entries: SitemapEntry[]): string {
  const hasImages = entries.some((e) => e.images && e.images.length > 0);
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${hasImages ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : ""}>`,
  ];
  for (const e of entries) {
    lines.push("  <url>");
    lines.push(`    <loc>${xmlEscape(e.url)}</loc>`);
    if (e.lastModified) lines.push(`    <lastmod>${e.lastModified.toISOString()}</lastmod>`);
    if (e.changeFrequency) lines.push(`    <changefreq>${e.changeFrequency}</changefreq>`);
    if (e.priority !== undefined) lines.push(`    <priority>${e.priority}</priority>`);
    for (const img of e.images ?? []) {
      lines.push("    <image:image>");
      lines.push(`      <image:loc>${xmlEscape(img)}</image:loc>`);
      lines.push("    </image:image>");
    }
    lines.push("  </url>");
  }
  lines.push("</urlset>");
  return lines.join("\n") + "\n";
}
