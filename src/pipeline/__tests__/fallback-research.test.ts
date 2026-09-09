import { afterEach, describe, expect, it, vi } from "vitest";
import { AiError, isFallbackConfigured, resolveModel, resolveProvider, shouldFallbackToGroq, withFallback } from "@/lib/ai";
import { buildSourceUrls } from "../research";
import { evergreenQuery, rankOfficialResults, searchMicrosoft } from "../search";

const ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ENV };
  vi.restoreAllMocks();
});

describe("Groq fallback", () => {
  it("only a 429 that survived the retries qualifies", () => {
    expect(shouldFallbackToGroq(new AiError("Gemini rate limit / quota exhausted (429).", true, 429))).toBe(true);
    expect(shouldFallbackToGroq({ status: 429 })).toBe(true);
    expect(shouldFallbackToGroq(new AiError("Gemini API error 503", true, 503))).toBe(false);
    expect(shouldFallbackToGroq(new AiError("Model JSON failed validation"))).toBe(false);
    expect(shouldFallbackToGroq(new Error("fetch failed"))).toBe(false);
  });

  it("withFallback uses the fallback on a 429 and reports it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const primary = vi.fn(async () => {
      throw new AiError("Gemini rate limit (429).", true, 429);
    });
    const fallback = vi.fn(async () => "from-groq");
    const r = await withFallback(primary, fallback, shouldFallbackToGroq);
    expect(r).toEqual({ value: "from-groq", usedFallback: true });
    expect(primary).toHaveBeenCalledTimes(1);
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it("withFallback does not touch the fallback for other errors or when it is unset", async () => {
    const fallback = vi.fn(async () => "from-groq");
    await expect(withFallback(async () => { throw new AiError("bad JSON"); }, fallback, shouldFallbackToGroq)).rejects.toThrow("bad JSON");
    expect(fallback).not.toHaveBeenCalled();
    await expect(withFallback(async () => { throw new AiError("429", true, 429); }, null, shouldFallbackToGroq)).rejects.toThrow("429");
  });

  it("propagates the fallback's own error when both fail", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      withFallback(
        async () => { throw new AiError("primary 429", true, 429); },
        async () => { throw new AiError("Groq rate limit (429).", true, 429); },
        shouldFallbackToGroq,
      ),
    ).rejects.toThrow("Groq rate limit");
  });

  it("is configured only when GROQ_API_KEY is set; groq can also be the primary", () => {
    delete process.env.GROQ_API_KEY;
    expect(isFallbackConfigured()).toBe(false);
    process.env.GROQ_API_KEY = "gsk_test_1234567890";
    expect(isFallbackConfigured()).toBe(true);
    expect(resolveModel("groq")).toBe("llama-3.3-70b-versatile");
    process.env.AI_PROVIDER = "groq";
    delete process.env.AI_MODEL;
    expect(resolveProvider()).toBe("groq");
  });
});

describe("evergreen research", () => {
  it("builds the search term from the error code, else the feature phrase", () => {
    expect(evergreenQuery("How to fix error 0x800f0922 in Windows 11")).toEqual({ query: '"0x800f0922" Windows 11', tokens: ["0x800f0922"] });
    const q = evergreenQuery("How to disable Copilot in Windows 11");
    expect(q.query).toBe("disable Copilot Windows 11");
    expect(q.tokens).toEqual(["disable", "copilot"]);
  });

  it("ranks official Windows pages first and drops unrelated Microsoft products", () => {
    const results = [
      { title: "Manage GitHub Copilot installation - Visual Studio", url: "https://learn.microsoft.com/en-us/visualstudio/ide/copilot-install" },
      { title: "Copilot in Windows: settings and how to turn it off", url: "https://support.microsoft.com/en-us/windows/copilot-in-windows-abc" },
      { title: "Manage Copilot in Windows 11", url: "https://learn.microsoft.com/en-us/windows/client-management/manage-windows-copilot" },
      { title: "Random blog", url: "https://example.com/copilot" },
      { title: "Enable Fabric Copilot for Power BI", url: "https://learn.microsoft.com/en-us/power-bi/copilot-enable" },
    ];
    const picked = rankOfficialResults(results, "How to disable Copilot in Windows 11");
    expect(picked).toHaveLength(2);
    expect(picked).toEqual(expect.arrayContaining(["https://learn.microsoft.com/en-us/windows/client-management/manage-windows-copilot", "https://support.microsoft.com/en-us/windows/copilot-in-windows-abc"]));
  });

  it("searchMicrosoft returns the top official pages, and [] on failure", async () => {
    const fakeFetch = vi.fn(async (url: string) => {
      expect(url).toContain(encodeURIComponent('"0x800f0922" Windows 11'));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            { title: "Error code 0x800F0922 when installing Windows updates", url: "https://learn.microsoft.com/en-us/troubleshoot/windows-client/installing-updates/error-0x800f0922" },
            { title: "Error 0x800F0922 installing updates - Windows Server", url: "https://learn.microsoft.com/en-us/troubleshoot/windows-server/installing-updates-features-roles/error-0x800f0922" },
            { title: "Resolved issues in Windows 11, version 24H2", url: "https://learn.microsoft.com/en-us/windows/release-health/resolved-issues-windows-11-24h2" },
            { title: "Windows Documentation", url: "https://learn.microsoft.com/en-us/windows/" },
            { title: "Azure thing 0x800f0922", url: "https://learn.microsoft.com/en-us/azure/x" },
          ],
        }),
      };
    });
    const urls = await searchMicrosoft("How to fix error 0x800f0922 in Windows 11", fakeFetch);
    expect(urls[0]).toBe("https://learn.microsoft.com/en-us/troubleshoot/windows-client/installing-updates/error-0x800f0922");
    // Pages that never name the term (hubs, generic release-health lists) are left out; unrelated products too.
    expect(urls).not.toContain("https://learn.microsoft.com/en-us/windows/");
    expect(urls).not.toContain("https://learn.microsoft.com/en-us/azure/x");
    expect(urls).toContain("https://learn.microsoft.com/en-us/troubleshoot/windows-server/installing-updates-features-roles/error-0x800f0922");
    expect(urls.length).toBeLessThanOrEqual(3);
    expect(await searchMicrosoft("anything", async () => ({ ok: false, status: 500, json: async () => ({}) }))).toEqual([]);
    expect(await searchMicrosoft("anything", async () => { throw new Error("offline"); })).toEqual([]);
  });

  it("buildSourceUrls puts official pages first and skips generic references when it has them", () => {
    const official = ["https://learn.microsoft.com/en-us/troubleshoot/windows-client/x", "https://support.microsoft.com/en-us/windows/y"];
    const withOfficial = buildSourceUrls({ phrase: "How to fix error 0x800f0922 in Windows 11", link: "https://feed.example/item", official });
    expect(withOfficial.slice(0, 2)).toEqual(official);
    expect(withOfficial).toContain("https://feed.example/item");
    expect(withOfficial.some((u) => u.includes("release-health/") || u.includes("windows-update-error-reference"))).toBe(false);

    const generic = buildSourceUrls({ phrase: "How to fix error 0x800f0922 in Windows 11", official: [] });
    expect(generic.some((u) => u.includes("windows-update-error-reference"))).toBe(true);
    expect(generic.some((u) => u.includes("release-health/"))).toBe(true);
  });
});
