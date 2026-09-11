import { describe, expect, it } from "vitest";
import { extractIdentifiers, htmlToText, identifiersNotInSources, keywordsFromItem } from "../extract";

describe("extractIdentifiers", () => {
  it("finds KB numbers, builds, error codes and versions", () => {
    const ids = extractIdentifiers("September 9, 2025—KB5065426 (OS Build 26100.6584) fixes 0x800F0922 on Windows 11 24H2; also kb 5062553");
    expect(ids.kb).toEqual(["KB5065426", "KB5062553"]);
    expect(ids.builds).toEqual(["26100.6584"]);
    expect(ids.errorCodes).toEqual(["0x800f0922"]);
    expect(ids.versions).toEqual(["24H2"]);
  });
  it("ignores plain decimals and short numbers", () => {
    const ids = extractIdentifiers("version 3.14 and 1234.5 and KB12");
    expect(ids.builds).toEqual([]);
    expect(ids.kb).toEqual([]);
  });
});

describe("keywordsFromItem", () => {
  const base = { link: "https://example.com/x", summary: "", published: null };
  it("turns an Insider build post into a what's-new keyword", () => {
    const k = keywordsFromItem({ ...base, source: "insider", title: "Announcing Windows 11 Insider Preview Build 26200.5074 (Dev Channel)" });
    expect(k).toHaveLength(1);
    expect(k[0].categorySlug).toBe("windows-updates");
    expect(k[0].phrase).toBe("What's new in Windows 11 Insider Preview Build 26200.5074 (Dev Channel)");
  });
  it("reads build numbers from the body of 'Announcing new builds for <date>' posts", () => {
    const k = keywordsFromItem({ ...base, source: "insider", title: "Announcing new builds for 31 August 2026", summary: "Dev Channel Build 26300.1234 and Beta Channel Build 26200.5074 are now available." });
    expect(k.map((x) => x.phrase)).toEqual(["What's new in Windows 11 Insider Preview Build 26300.1234", "What's new in Windows 11 Insider Preview Build 26200.5074"]);
  });
  it("falls back to a dated phrase when the build numbers are only on the linked page", () => {
    const k = keywordsFromItem({ ...base, source: "insider", title: "Announcing new Release Preview builds for 14 August 2026", summary: "Hello Windows Insiders…" });
    expect(k.map((x) => x.phrase)).toEqual(["What's new in the Windows 11 Insider builds for 14 August 2026"]);
  });
  it("turns a Release Preview version post into a what's-new keyword", () => {
    const k = keywordsFromItem({ ...base, source: "insider", title: "Releasing Windows 11, version 26H2 to the Release Preview Channel" });
    expect(k.map((x) => x.phrase)).toEqual(["What's new in Windows 11 26H2"]);
  });
  it("turns a feature announcement into a how-to keyword", () => {
    const k = keywordsFromItem({ ...base, source: "insider", title: "Improving File Explorer & Context Menu: faster, simpler, and more customizable" });
    expect(k).toEqual([expect.objectContaining({ phrase: "Improving File Explorer & Context Menu", categorySlug: "how-to" })]);
  });
  it("turns a routine update-history KB into a windows-updates keyword only (no speculative 'not installing' post)", () => {
    const k = keywordsFromItem({ ...base, source: "update-history", title: "September 9, 2025—KB5065426 (OS Build 26100.6584)" });
    expect(k.map((x) => x.categorySlug)).toEqual(["windows-updates"]);
    expect(k[0].phrase).toContain("KB5065426");
  });
  it("adds a 'not installing' problems keyword only when the entry's own text signals a real issue", () => {
    const k = keywordsFromItem({ ...base, source: "update-history", title: "September 9, 2025—KB5065426 (OS Build 26100.6584)", summary: "Known issue: this update may fail to install on some devices." });
    expect(k.map((x) => x.categorySlug)).toEqual(["windows-updates", "update-problems"]);
    expect(k[1].phrase).toBe("KB5065426 not installing or stuck in Windows 11");
  });
  it("adds an error-code keyword per code, never inventing one", () => {
    const k = keywordsFromItem({ ...base, source: "release-health", title: "Some devices might fail to install the update", summary: "Users see 0x800f0922 or 0x80070002." });
    expect(k.map((x) => x.phrase)).toEqual([
      "Some devices might fail to install the update",
      "How to fix error 0x800f0922 in Windows 11",
      "How to fix error 0x80070002 in Windows 11",
    ]);
  });
  it("returns nothing for an item with no identifiers or problem wording", () => {
    expect(keywordsFromItem({ ...base, source: "other", title: "Weekly roundup" })).toEqual([]);
  });
});

describe("identifiersNotInSources", () => {
  it("flags identifiers absent from the sources and passes the ones present", () => {
    const flagged = identifiersNotInSources("Install KB5065426 to fix 0x800f0922 on build 26100.6584. Some say KB5000000 helps.", "KB5065426 (OS Build 26100.6584) resolves 0x800F0922");
    expect(flagged).toEqual(["KB5000000"]);
  });
});

describe("htmlToText", () => {
  it("strips tags and scripts and decodes entities", () => {
    expect(htmlToText("<p>Hello &amp; <b>world</b></p><script>x()</script><li>item</li>")).toBe("Hello & world\nitem");
  });
});
