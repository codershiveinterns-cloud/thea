/**
 * /robots.txt — public pages are crawlable; admin and API are not. /search stays crawlable so bots can
 * read its noindex tag (a disallowed URL can still be indexed from links alone).
 * /api/og is re-allowed because it is the fallback featured/OG image for every post: the most
 * specific rule wins, so crawlers can still fetch the branded image while the rest of /api/ stays closed.
 */
import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/og"],
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE.url,
  };
}
