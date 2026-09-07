import { describe, expect, it } from "vitest";
import { classifySource, parseFeed } from "../sources/feeds";

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>
<item><title><![CDATA[September 9, 2025—KB5065426 (OS Build 26100.6584)]]></title><link>https://support.microsoft.com/help/5065426</link><pubDate>Tue, 09 Sep 2025 17:00:00 GMT</pubDate><description><![CDATA[<p>Highlights &amp; fixes</p>]]></description></item>
<item><title>bad</title><link>not-a-url</link></item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Announcing Windows 11 Insider Preview Build 26200.5074 (Dev Channel)</title><link href="https://blogs.windows.com/windows-insider/2025/09/09/x/"/><updated>2025-09-09T17:00:00Z</updated><summary>Hi</summary></entry></feed>`;

describe("parseFeed", () => {
  it("parses RSS, decodes CDATA/HTML, drops invalid items", () => {
    const items = parseFeed(RSS, "update-history");
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("September 9, 2025—KB5065426 (OS Build 26100.6584)");
    expect(items[0].summary).toBe("Highlights & fixes");
    expect(items[0].published?.toISOString()).toBe("2025-09-09T17:00:00.000Z");
  });
  it("parses Atom with href links", () => {
    const items = parseFeed(ATOM, "insider");
    expect(items[0].link).toBe("https://blogs.windows.com/windows-insider/2025/09/09/x/");
  });
  it("returns [] for garbage", () => {
    expect(parseFeed("<html>nope</html>", "other")).toEqual([]);
  });
});

describe("classifySource", () => {
  it("maps known hosts", () => {
    expect(classifySource("https://blogs.windows.com/windows-insider/feed/")).toBe("insider");
    expect(classifySource("https://support.microsoft.com/en-us/feed/rss/abc")).toBe("update-history");
    expect(classifySource("https://learn.microsoft.com/windows/release-health/x")).toBe("release-health");
  });
});
