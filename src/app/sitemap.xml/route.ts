/**
 * /sitemap.xml — home, the five category pages, static pages, authors with published posts,
 * and every PUBLISHED post with its featured image. Built by hand (src/lib/xml.ts) rather than
 * Next's metadata route because that serializer leaves `&` unescaped inside <image:loc>, which
 * Google's parser rejects. Revalidated hourly and on every publish (revalidatePublicSite()).
 */
import { sitemapEntries } from "@/lib/sitemap";
import { buildSitemapXml } from "@/lib/xml";

export const revalidate = 3600;

export async function GET() {
  const xml = buildSitemapXml(await sitemapEntries());
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
