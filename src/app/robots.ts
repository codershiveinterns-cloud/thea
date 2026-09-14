/**
 * /robots.txt — public pages are crawlable; admin and API are not. /search stays crawlable so bots can
 * read its noindex tag (a disallowed URL can still be indexed from links alone).
 * /api/og and /api/illustration are re-allowed because they render the featured/OG image used by
 * every post (the branded card, or a generated Windows Settings illustration): the most specific
 * rule wins, so crawlers can still fetch those while the rest of /api/ stays closed.
 */
import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/og", "/api/illustration"],
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE.url,
  };
}
