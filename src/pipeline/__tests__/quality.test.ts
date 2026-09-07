import { describe, expect, it } from "vitest";
import { decidePublish, structureProblems } from "../quality";
import { pickAuthor, selectKeywords } from "../select";
import { buildSourceUrls } from "../research";
import { spreadDelays } from "../scheduler";

describe("decidePublish (CLAUDE.md step 9)", () => {
  it("never publishes when AUTO_PUBLISH is off", () => {
    expect(decidePublish({ autoPublish: false, score: 100, flaggedIdentifiers: [] })).toBe("REVIEW");
  });
  it("publishes only at 85+ with no flagged identifiers", () => {
    expect(decidePublish({ autoPublish: true, score: 85, flaggedIdentifiers: [] })).toBe("PUBLISHED");
    expect(decidePublish({ autoPublish: true, score: 84, flaggedIdentifiers: [] })).toBe("REVIEW");
    expect(decidePublish({ autoPublish: true, score: 99, flaggedIdentifiers: ["KB1234567"] })).toBe("REVIEW");
  });
});

describe("structureProblems", () => {
  const post = {
    title: "t", slug: "t", quickAnswer: "q", affectedBuilds: [], metaTitle: "m", metaDescription: "d", internalLinkSuggestions: [],
    faq: [{ question: "a", answer: "b" }],
    body: "# H1\n## Method 1: x\n" + "word ".repeat(100),
  };
  it("lists every missing piece", () => {
    const p = structureProblems(post);
    expect(p).toContain('No "## If nothing worked" section');
    expect(p).toContain("Only 1 FAQ items");
    expect(p).toContain("Body contains an H1");
    expect(p).toContain("Body under 250 words (thin)");
  });
});

describe("selectKeywords", () => {
  const mk = (id: string, slug: string, t: number) => ({ id, phrase: id, categoryId: slug, categorySlug: slug, createdAt: new Date(t) });
  it("takes newest first and never a third post in one category per day", () => {
    const q = [mk("a", "error-codes", 1), mk("b", "error-codes", 2), mk("c", "error-codes", 3), mk("d", "how-to", 4)];
    expect(selectKeywords(q, 3, {}).map((k) => k.id)).toEqual(["d", "c", "b"]);
    expect(selectKeywords(q, 3, { "error-codes": 2 }).map((k) => k.id)).toEqual(["d"]);
  });
});

describe("pickAuthor", () => {
  const authors = [
    { id: "1", name: "A", stylePrompt: "", categoryFocus: ["error-codes"] },
    { id: "2", name: "B", stylePrompt: "", categoryFocus: ["error-codes", "how-to"] },
    { id: "3", name: "C", stylePrompt: "", categoryFocus: ["how-to"] },
  ];
  it("picks within the category focus and avoids the previous author", () => {
    expect(pickAuthor(authors, "error-codes", "1", () => 0)?.id).toBe("2");
    expect(pickAuthor(authors, "how-to", "3", () => 0.99)?.id).toBe("2");
  });
  it("falls back to the same author when they are the only match", () => {
    expect(pickAuthor(authors.slice(0, 1), "error-codes", "1", () => 0)?.id).toBe("1");
  });
});

describe("buildSourceUrls", () => {
  it("puts KB support articles first, then the feed link, then official references, max 5", () => {
    const urls = buildSourceUrls({ phrase: "KB5065426 not installing 0x800f0922", link: "https://x.test/a" });
    expect(urls[0]).toBe("https://support.microsoft.com/help/5065426");
    expect(urls[1]).toBe("https://x.test/a");
    expect(urls.length).toBeLessThanOrEqual(5);
    expect(urls.some((u) => u.includes("windows-update-error-reference"))).toBe(true);
  });
});

describe("spreadDelays", () => {
  it("spaces posts 2–3 hours apart", () => {
    const d = spreadDelays(3, () => 0.5);
    expect(d).toEqual([2.5 * 3600000, 5 * 3600000]);
    expect(spreadDelays(1)).toEqual([]);
  });
});
