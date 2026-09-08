import { describe, expect, it } from "vitest";
import { decideBasicAuth, parseBasicAuth, safeEqual } from "@/lib/basic-auth";

const header = (u: string, p: string) => `Basic ${btoa(`${u}:${p}`)}`;

describe("parseBasicAuth", () => {
  it("decodes user and password, allowing colons in the password", () => {
    expect(parseBasicAuth(header("editor", "p:ss:word"))).toEqual({ user: "editor", password: "p:ss:word" });
  });
  it("rejects missing, non-Basic and malformed headers", () => {
    expect(parseBasicAuth(null)).toBeNull();
    expect(parseBasicAuth("Bearer abc")).toBeNull();
    expect(parseBasicAuth("Basic !!!")).toBeNull();
    expect(parseBasicAuth(`Basic ${btoa("nocolon")}`)).toBeNull();
  });
});

describe("safeEqual", () => {
  it("compares strings without early exit", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});

describe("decideBasicAuth", () => {
  const env = { user: "editor", password: "s3cret", nodeEnv: "production" };
  it("allows correct credentials and rejects wrong ones", () => {
    expect(decideBasicAuth({ ...env, header: header("editor", "s3cret") })).toBe("allow");
    expect(decideBasicAuth({ ...env, header: header("editor", "nope") })).toBe("unauthorized");
    expect(decideBasicAuth({ ...env, header: header("someone", "s3cret") })).toBe("unauthorized");
    expect(decideBasicAuth({ ...env, header: null })).toBe("unauthorized");
  });
  it("skips auth in development when the vars are unset, fails closed elsewhere", () => {
    expect(decideBasicAuth({ header: null, user: undefined, password: undefined, nodeEnv: "development" })).toBe("allow");
    expect(decideBasicAuth({ header: null, user: "", password: "", nodeEnv: "development" })).toBe("allow");
    expect(decideBasicAuth({ header: null, user: undefined, password: undefined, nodeEnv: "production" })).toBe("not-configured");
    expect(decideBasicAuth({ header: null, user: "editor", password: undefined, nodeEnv: "production" })).toBe("not-configured");
  });
  it("enforces credentials in development once they are set", () => {
    expect(decideBasicAuth({ header: null, user: "editor", password: "x", nodeEnv: "development" })).toBe("unauthorized");
  });
});
