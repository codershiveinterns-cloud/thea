import { describe, expect, it } from "vitest";
import { parseJsonLoose } from "@/lib/ai";
import { buildSystemPrompt, buildUserPrompt, generatedPostSchema } from "../generate";

const good = {
  title: "How to fix error 0x800f0922 in Windows 11",
  slug: "Fix 0x800f0922 Windows 11!",
  quickAnswer: "Run the Windows Update troubleshooter first, then repair system files with DISM and SFC before retrying the update.",
  body: `Intro paragraph about the error.\n\n## Method 1: Run the troubleshooter\n\n1. Open Settings.\n2. Run it.\n\n## Method 2: DISM and SFC\n\n1. Open Terminal.\n2. Run DISM.\n\n## If nothing worked\n\nInstall manually.\n${"word ".repeat(120)}`,
  affectedBuilds: ["Windows 11 24H2"],
  faq: [
    { question: "What does 0x800f0922 mean?", answer: "It is a Windows Update failure code." },
    { question: "Will I lose files?", answer: "No, the repair steps keep your files." },
    { question: "Does a VPN cause it?", answer: "It can block the update servers." },
  ],
  metaTitle: "Fix error 0x800f0922 in Windows 11",
  metaDescription: "Step-by-step fixes for Windows Update error 0x800f0922, from the troubleshooter to a manual install.",
  internalLinkSuggestions: ["Windows 11 update stuck at 100 percent"],
};

describe("parseJsonLoose", () => {
  it("strips code fences and surrounding prose", () => {
    expect(parseJsonLoose('Here you go:\n```json\n{"a":1}\n```\nThanks')).toEqual({ a: 1 });
  });
  it("throws on no JSON", () => {
    expect(() => parseJsonLoose("nothing here")).toThrow();
  });
});

describe("generatedPostSchema", () => {
  it("accepts a well-formed post and slugifies the slug", () => {
    const r = generatedPostSchema.safeParse(good);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.slug).toBe("fix-0x800f0922-windows-11");
  });
  it("rejects a body without Method 1 or If nothing worked", () => {
    expect(generatedPostSchema.safeParse({ ...good, body: "## Steps\n" + "word ".repeat(200) }).success).toBe(false);
  });
  it("rejects raw HTML in the body", () => {
    expect(generatedPostSchema.safeParse({ ...good, body: good.body + "\n<script>alert(1)</script>" }).success).toBe(false);
  });
  it("rejects too few FAQ items and long meta titles", () => {
    expect(generatedPostSchema.safeParse({ ...good, faq: good.faq.slice(0, 2) }).success).toBe(false);
    expect(generatedPostSchema.safeParse({ ...good, metaTitle: "x".repeat(80) }).success).toBe(false);
  });
});

describe("prompts", () => {
  it("include the structure rules, the author style and the sources", () => {
    const sys = buildSystemPrompt({ name: "Dana", stylePrompt: "Calm and factual." });
    expect(sys).toContain("## Method 1");
    expect(sys).toContain("Calm and factual.");
    const user = buildUserPrompt({ phrase: "kw", categorySlug: "error-codes", categoryName: "Error Codes", author: { name: "Dana", stylePrompt: "" }, sourcesText: "SOURCE TEXT", existingTitles: ["Existing post"] });
    expect(user).toContain("SOURCE TEXT");
    expect(user).toContain("- Existing post");
  });
});
