/**
 * /feed.xml — RSS 2.0 feed of the 30 newest PUBLISHED posts.
 * Statically cached for an hour (revalidate) and refreshed on every publish via revalidatePublicSite().
 */
import { SITE } from "@/lib/constants";
import { allPublishedForIndex } from "@/lib/posts";
import { absoluteUrl, postPath } from "@/lib/seo";
import { xmlEscape } from "@/lib/xml";

export const revalidate = 3600;

const FEED_ITEMS = 30;


export async function GET() {
  const posts = (await allPublishedForIndex()).slice(0, FEED_ITEMS);
  const feedUrl = absoluteUrl("/feed.xml");
  const now = new Date();

  let lastBuild = posts[0]?.updatedAt;
  for (const p of posts) if (!lastBuild || p.updatedAt > lastBuild) lastBuild = p.updatedAt;

  const items = posts
    .map((p) => {
      const link = absoluteUrl(postPath(p.category.slug, p.slug));
      const pubDate = (p.publishedAt ?? p.updatedAt).toUTCString();
      return [
        "    <item>",
        `      <title>${xmlEscape(p.title)}</title>`,
        `      <link>${xmlEscape(link)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <description>${xmlEscape(p.quickAnswer)}</description>`,
        `      <category>${xmlEscape(p.category.name)}</category>`,
        `      <dc:creator>${xmlEscape(p.author.name)}</dc:creator>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    "  <channel>",
    `    <title>${xmlEscape(SITE.name)}</title>`,
    `    <link>${xmlEscape(absoluteUrl("/"))}</link>`,
    `    <description>${xmlEscape(SITE.tagline)}</description>`,
    "    <language>en-us</language>",
    `    <lastBuildDate>${(lastBuild ?? now).toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${xmlEscape(feedUrl)}" rel="self" type="application/rss+xml" />`,
    "    <image>",
    `      <url>${xmlEscape(absoluteUrl("/icon.png"))}</url>`,
    `      <title>${xmlEscape(SITE.name)}</title>`,
    `      <link>${xmlEscape(absoluteUrl("/"))}</link>`,
    "    </image>",
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
