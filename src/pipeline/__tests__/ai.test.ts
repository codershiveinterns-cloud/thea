import { afterEach, describe, expect, it, vi } from "vitest";
import { AiError, isRetryable, redact, resolveModel, resolveProvider, retryWithBackoff } from "@/lib/ai";

const ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ENV };
});

describe("resolveProvider / resolveModel", () => {
  it("honours AI_PROVIDER and AI_MODEL", () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.AI_MODEL = "gemini-2.5-pro";
    expect(resolveProvider()).toBe("gemini");
    expect(resolveModel()).toBe("gemini-2.5-pro");
  });
  it("falls back to whichever key is set, then per-provider defaults", () => {
    delete process.env.AI_PROVIDER;
    delete process.env.AI_MODEL;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    process.env.GEMINI_API_KEY = "test-key-1234567890";
    expect(resolveProvider()).toBe("gemini");
    expect(resolveModel()).toBe("gemini-3.6-flash");
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-1234567890";
    expect(resolveProvider()).toBe("anthropic");
    expect(resolveModel()).toBe("claude-opus-5");
  });
  it("rejects unknown providers", () => {
    process.env.AI_PROVIDER = "openai";
    expect(() => resolveProvider()).toThrow(/AI_PROVIDER/);
  });
});

describe("redact", () => {
  it("removes configured keys and key= query params from messages", () => {
    process.env.GEMINI_API_KEY = "AIzaSySECRETSECRETSECRET";
    expect(redact("401 for https://x/v1?key=AIzaSySECRETSECRETSECRET and AIzaSySECRETSECRETSECRET again")).toBe("401 for https://x/v1?key=[redacted] and [GEMINI_API_KEY redacted] again");
  });
  it("AiError messages are redacted on construction", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-abcdefghijkl";
    expect(new AiError("bad sk-ant-abcdefghijkl").message).toBe("bad [ANTHROPIC_API_KEY redacted]");
  });
});

describe("isRetryable", () => {
  it("treats 429, 5xx, network and quota errors as retryable, 4xx as not", () => {
    expect(isRetryable({ status: 429 })).toBe(true);
    expect(isRetryable({ status: 503 })).toBe(true);
    expect(isRetryable({ status: 400 })).toBe(false);
    expect(isRetryable(new Error("RESOURCE_EXHAUSTED: quota"))).toBe(true);
    expect(isRetryable(new Error("fetch failed"))).toBe(true);
    expect(isRetryable(new AiError("nope", false))).toBe(false);
  });
});

describe("retryWithBackoff", () => {
  it("retries rate limits with exponential delays and honours Retry-After", async () => {
    const sleeps: number[] = [];
    const sleep = async (ms: number) => void sleeps.push(ms);
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls === 1) throw { status: 429, message: "rate limited" };
      if (calls === 2) throw { status: 503, message: "overloaded", headers: { "retry-after": "7" } };
      return "ok";
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await retryWithBackoff(fn, { sleep, random: () => 0.5, baseDelayMs: 1000 });
    expect(r.value).toBe("ok");
    expect(r.attempts).toBe(3);
    expect(sleeps).toEqual([1500, 7000]);
  });
  it("does not retry non-retryable errors", async () => {
    const fn = vi.fn(async () => {
      throw { status: 401, message: "bad key" };
    });
    await expect(retryWithBackoff(fn, { sleep: async () => {} })).rejects.toMatchObject({ status: 401 });
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it("gives up after maxAttempts", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fn = vi.fn(async () => {
      throw { status: 429 };
    });
    await expect(retryWithBackoff(fn, { sleep: async () => {}, maxAttempts: 3 })).rejects.toMatchObject({ status: 429 });
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
