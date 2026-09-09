import { describe, expect, it } from "vitest";
import { LEGAL, LEGAL_PAGES, formatLegalDate, legalPath } from "@/lib/legal";
import { normalizeGaId } from "@/lib/tracking";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3100";

async function serverUp(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/robots.txt`, { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch {
    return false;
  }
}

describe("legal pages: registry", () => {
  it("defines all six pages with hard-coded entity, contact and law", () => {
    expect(LEGAL_PAGES.map((p) => p.slug)).toEqual(["privacy-policy", "terms", "cookie-policy", "disclaimer", "advertising-disclosure", "copyright"]);
    expect(LEGAL.entity).toBe("Thea");
    expect("email" in LEGAL).toBe(false);
    expect(LEGAL.governingLaw).toBe("India");
    expect(LEGAL.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(formatLegalDate("2026-09-09")).toBe("9 September 2026");
    expect(legalPath("terms")).toBe("/terms");
  });
  it("normalises GA ids", () => {
    expect(normalizeGaId(" G-ABC123 ")).toBe("G-ABC123");
    expect(normalizeGaId("UA-1")).toBeNull();
    expect(normalizeGaId("")).toBeNull();
  });
});

// HTTP checks run against a live server (TEST_BASE_URL, default http://localhost:3100); skipped when none is up.
describe("legal pages: HTTP", async () => {
  const up = await serverUp();
  for (const page of LEGAL_PAGES) {
    it.skipIf(!up)(`${legalPath(page.slug)} returns 200, is indexable and shows the last-updated date`, async () => {
      const res = await fetch(`${BASE}${legalPath(page.slug)}`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain(`<title>${page.title}`);
      expect(html).toMatch(/<meta name="robots" content="index, follow"/);
      expect(html).toContain(formatLegalDate());
      expect(html).toContain('href="/contact"');
      expect(html).not.toMatch(/mailto:|codershiveinterns/);
    });
  }
  it.skipIf(!up)("sitemap lists every legal page and the footer links them", async () => {
    const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
    const home = await (await fetch(`${BASE}/`)).text();
    for (const page of LEGAL_PAGES) {
      expect(sitemap).toContain(`${legalPath(page.slug)}</loc>`);
      expect(home).toContain(`href="${legalPath(page.slug)}"`);
    }
    expect(home).toContain('<meta name="color-scheme" content="light"');
    expect(home).not.toContain("data-theme");
  });
});
