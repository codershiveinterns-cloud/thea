import { describe, expect, it } from "vitest";
import { alertBody, alertReasonFor, alertSubject } from "@/lib/alerts";
import type { PipelineReport } from "../log";

const base: PipelineReport = {
  ok: true,
  dryRun: false,
  startedAt: "2026-09-08T03:30:00.000Z",
  finishedAt: "2026-09-08T03:34:12.000Z",
  ingest: { feeds: [{ url: "https://blogs.windows.com/windows-insider/feed/", items: 300 }], newKeywords: 2 },
  posts: [],
  usage: { inputTokens: 100, outputTokens: 50 },
  log: [],
};
const post = { keywordId: "k", phrase: "kw", categorySlug: "error-codes", status: "REVIEW" as const, postId: "p1", title: "T", qualityScore: 88, flaggedIdentifiers: [], error: null };

describe("alertReasonFor", () => {
  it("alerts on failure, on empty runs, never on dry runs or healthy runs", () => {
    expect(alertReasonFor({ ...base, ok: false })).toBe("failed");
    expect(alertReasonFor(base)).toBe("nothing-published");
    expect(alertReasonFor({ ...base, posts: [post] })).toBeNull();
    expect(alertReasonFor({ ...base, dryRun: true })).toBeNull();
    expect(alertReasonFor({ ...base, ok: false, dryRun: true })).toBeNull();
  });
  it("treats a run whose only post failed as nothing published", () => {
    expect(alertReasonFor({ ...base, posts: [{ ...post, postId: null, status: "FAILED" }] })).toBe("nothing-published");
  });
});

describe("alertSubject / alertBody", () => {
  it("names the day and the reason, and includes errors and outcomes", () => {
    const report = { ...base, ok: false, log: [{ at: "x", level: "error" as const, step: "post", message: "Generation failed: 503" }], posts: [{ ...post, postId: null, status: "FAILED" as const, error: "Generation failed: 503" }] };
    expect(alertSubject("failed", report)).toBe("[Thea] Pipeline run FAILED — 2026-09-08");
    const body = alertBody("failed", report, "0 posts created, 1 failed.");
    expect(body).toContain("- [post] Generation failed: 503");
    expect(body).toContain('FAILED: "kw"');
    expect(body).toContain("/admin");
  });
});
