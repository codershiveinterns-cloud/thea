import { describe, expect, it } from "vitest";
import { safeUrl, stripControlChars, truncate } from "@/lib/sanitize";
import { parseRunHistory, pushRunHistory } from "../run";

describe("safeUrl", () => {
  it("keeps http(s), mailto, paths, anchors and relative links", () => {
    expect(safeUrl("https://support.microsoft.com/help/5065426")).toBe("https://support.microsoft.com/help/5065426");
    expect(safeUrl("mailto:contact@example.com")).toBe("mailto:contact@example.com");
    expect(safeUrl("/error-codes")).toBe("/error-codes");
    expect(safeUrl("#method-1")).toBe("#method-1");
    expect(safeUrl("../x")).toBe("../x");
  });
  it("drops javascript:, data:, vbscript:, protocol-relative and empty", () => {
    expect(safeUrl("javascript:alert(1)")).toBe("");
    expect(safeUrl("JAVASCRIPT:alert(1)")).toBe("");
    expect(safeUrl("data:text/html;base64,AAAA")).toBe("");
    expect(safeUrl("vbscript:msgbox")).toBe("");
    expect(safeUrl("//evil.example/x")).toBe("");
    expect(safeUrl("")).toBe("");
    expect(safeUrl(undefined)).toBe("");
  });
});

describe("stripControlChars / truncate", () => {
  it("removes control characters but keeps tabs and newlines", () => {
    expect(stripControlChars("abc\td\ne")).toBe("abc\td\ne");
  });
  it("truncates long text", () => {
    expect(truncate("x".repeat(10), 4)).toBe("xxxx...");
    expect(truncate("short", 10)).toBe("short");
  });
});

describe("run history", () => {
  const e = (t: string, ok = true) => ({ startedAt: t, finishedAt: t, ok, summary: "s", errors: [], created: 0 });
  it("keeps newest first and caps the list", () => {
    let h = parseRunHistory("");
    for (let i = 0; i < 25; i++) h = pushRunHistory(h, e(String(i)));
    expect(h).toHaveLength(20);
    expect(h[0].finishedAt).toBe("24");
  });
  it("tolerates garbage", () => {
    expect(parseRunHistory("{not json")).toEqual([]);
    expect(parseRunHistory('[{"finishedAt":"x"},null,5]')).toHaveLength(1);
  });
});
