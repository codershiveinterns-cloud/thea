import { describe, expect, it } from "vitest";
import { formatCheckedDate, verificationText } from "@/lib/verification";

describe("verificationText", () => {
  const publishedAt = new Date("2026-09-08T03:30:00Z");
  const updatedAt = new Date("2026-09-09T10:00:00Z");
  it("uses the publish date in d MMMM yyyy and stays neutral without a tested build", () => {
    expect(formatCheckedDate(publishedAt)).toBe("8 September 2026");
    expect(verificationText({ publishedAt, updatedAt, testedOnBuild: null })).toBe(
      "Checked against Microsoft's release notes on 8 September 2026; re-checked when a new build ships.",
    );
  });
  it("appends the tested build when set, and falls back to updatedAt when unpublished", () => {
    expect(verificationText({ publishedAt, updatedAt, testedOnBuild: " Windows 11 25H2 " })).toMatch(/ Tested on build Windows 11 25H2\.$/);
    expect(verificationText({ publishedAt: null, updatedAt, testedOnBuild: null })).toContain("9 September 2026");
  });
  it("never mentions a pending badge", () => {
    expect(verificationText({ publishedAt, updatedAt, testedOnBuild: "" })).not.toMatch(/pending/i);
  });
});
