import { XMLParser, XMLValidator } from "fast-xml-parser";
import { describe, expect, it } from "vitest";
import { buildSitemapXml, xmlEscape } from "@/lib/xml";

describe("xmlEscape", () => {
  it("escapes the five XML entities and drops illegal control characters", () => {
    expect(xmlEscape(`a&b<c>d"e'f`)).toBe("a&amp;b&lt;c&gt;d&quot;e&apos;f");
    expect(xmlEscape("xyz")).toBe("xyz");
    expect(xmlEscape("tab\tnew\nline")).toBe("tab\tnew\nline");
  });
});

describe("buildSitemapXml", () => {
  const ogUrl = "https://thea.global/api/og?title=What%27s+new+in+KB5120998+%28Windows+11%29&category=windows-updates";
  const xml = buildSitemapXml([
    { url: "https://thea.global/", lastModified: new Date("2026-09-08T00:00:00Z"), changeFrequency: "daily", priority: 1 },
    { url: "https://thea.global/error-codes/fix-0x800f0922-windows-11?a=1&b=2", changeFrequency: "weekly", priority: 0.7, images: [ogUrl] },
  ]);

  it("is well-formed XML with the sitemap and image namespaces", () => {
    expect(XMLValidator.validate(xml)).toBe(true);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
  });

  it("escapes & in <loc> and <image:loc> and round-trips through a parser", () => {
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
    const doc = new XMLParser({ ignoreAttributes: false }).parse(xml);
    const urls = doc.urlset.url as Array<Record<string, unknown>>;
    expect(urls).toHaveLength(2);
    expect(urls[0].loc).toBe("https://thea.global/");
    expect(urls[0].lastmod).toBe("2026-09-08T00:00:00.000Z");
    expect(urls[1].loc).toBe("https://thea.global/error-codes/fix-0x800f0922-windows-11?a=1&b=2");
    expect((urls[1]["image:image"] as { "image:loc": string })["image:loc"]).toBe(ogUrl);
  });

  it("omits the image namespace when no entry has images", () => {
    const plain = buildSitemapXml([{ url: "https://thea.global/about" }]);
    expect(XMLValidator.validate(plain)).toBe(true);
    expect(plain).not.toContain("xmlns:image");
  });
});
