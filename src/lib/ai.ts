/**
 * Provider-agnostic structured-output wrapper used by the pipeline.
 *
 *   AI_PROVIDER = anthropic | gemini   (default: whichever key is set; anthropic if both)
 *   AI_MODEL    = model id for that provider (fallbacks: ANTHROPIC_MODEL / GEMINI_MODEL, then a per-provider default)
 *   ANTHROPIC_API_KEY / GEMINI_API_KEY   read by the SDKs; never logged, never echoed in errors.
 *
 * Every call goes through retryWithBackoff(): rate limits (429), overload/5xx and network errors are
 * retried with exponential backoff + jitter, honouring Retry-After when a provider sends one.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export type AiProvider = "anthropic" | "gemini" | "groq";

const DEFAULT_MODEL: Record<AiProvider, string> = { anthropic: "claude-opus-5", gemini: "gemini-3.6-flash", groq: "llama-3.3-70b-versatile" };
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function resolveProvider(): AiProvider {
  const explicit = env("AI_PROVIDER").toLowerCase();
  if (explicit === "anthropic" || explicit === "gemini" || explicit === "groq") return explicit;
  if (explicit) throw new AiError(`AI_PROVIDER must be "anthropic", "gemini" or "groq" (got "${explicit}").`);
  if (env("ANTHROPIC_API_KEY") || env("ANTHROPIC_AUTH_TOKEN")) return "anthropic";
  if (env("GEMINI_API_KEY")) return "gemini";
  return "anthropic";
}

export function resolveModel(provider: AiProvider = resolveProvider()): string {
  const specific = provider === "anthropic" ? env("ANTHROPIC_MODEL") : provider === "gemini" ? env("GEMINI_MODEL") : env("GROQ_MODEL");
  return env("AI_MODEL") || specific || DEFAULT_MODEL[provider];
}

export function isAiConfigured(provider: AiProvider = resolveProvider()): boolean {
  if (provider === "anthropic") return Boolean(env("ANTHROPIC_API_KEY") || env("ANTHROPIC_AUTH_TOKEN"));
  if (provider === "gemini") return Boolean(env("GEMINI_API_KEY"));
  return Boolean(env("GROQ_API_KEY"));
}

/** Groq is the rate-limit fallback for the primary provider; it needs its own key. */
export function isFallbackConfigured(): boolean {
  return Boolean(env("GROQ_API_KEY"));
}

export function describeAi(): string {
  const p = resolveProvider();
  return `${p} / ${resolveModel(p)}${isAiConfigured(p) ? "" : " (no API key set)"}`;
}

export class AiError extends Error {
  constructor(message: string, readonly retryable = false, readonly status?: number) {
    super(redact(message));
  }
}

/** Remove any configured secret from a string before it can reach a log or the UI. */
export function redact(text: string): string {
  let out = text.replace(/\bkey=[^&\s]+/gi, "key=[redacted]");
  for (const name of ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "GEMINI_API_KEY", "GROQ_API_KEY"]) {
    const v = env(name);
    if (v.length >= 8) out = out.split(v).join(`[${name} redacted]`);
  }
  return out;
}

export type AiUsage = { inputTokens: number; outputTokens: number };
export type AiResult<T> = { data: T; usage: AiUsage; provider: AiProvider; model: string; attempts: number; usedFallback: boolean };

export type GenerateOptions<T extends z.ZodTypeAny> = {
  schema: T;
  system: string;
  user: string;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
};

// ---------- retry ----------

export type RetryOptions = { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number; random?: () => number; sleep?: (ms: number) => Promise<void> };

function statusOf(err: unknown): number | undefined {
  const e = err as { status?: unknown; statusCode?: unknown; code?: unknown };
  for (const v of [e?.status, e?.statusCode, e?.code]) if (typeof v === "number") return v;
  return undefined;
}

function retryAfterMs(err: unknown): number | undefined {
  const headers = (err as { headers?: Record<string, string> | Headers })?.headers;
  const raw = headers instanceof Headers ? headers.get("retry-after") : headers?.["retry-after"];
  if (!raw) return undefined;
  const secs = Number(raw);
  return Number.isFinite(secs) ? secs * 1000 : undefined;
}

export function isRetryable(err: unknown): boolean {
  if (err instanceof AiError) return err.retryable;
  const status = statusOf(err);
  if (status === 429 || status === 408 || status === 409 || (status !== undefined && status >= 500)) return true;
  const msg = String((err as Error)?.message ?? "").toLowerCase();
  return /rate limit|resource_exhausted|quota|overloaded|unavailable|econnreset|etimedout|fetch failed|socket hang up|timeout/.test(msg);
}

/** Exponential backoff with full jitter: 2s, 4s, 8s, 16s (+ up to 1s jitter), capped. */
export async function retryWithBackoff<T>(fn: (attempt: number) => Promise<T>, opts: RetryOptions = {}): Promise<{ value: T; attempts: number }> {
  const maxAttempts = opts.maxAttempts ?? 5;
  const base = opts.baseDelayMs ?? 2000;
  const cap = opts.maxDelayMs ?? 30000;
  const random = opts.random ?? Math.random;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return { value: await fn(attempt), attempts: attempt };
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === maxAttempts) break;
      const delay = Math.min(cap, retryAfterMs(err) ?? base * 2 ** (attempt - 1) + Math.floor(random() * 1000));
      console.warn(`[ai] attempt ${attempt}/${maxAttempts} failed (${redact(String((err as Error)?.message ?? err)).slice(0, 160)}); retrying in ${Math.round(delay / 1000)}s`);
      await sleep(delay);
    }
  }
  throw lastErr;
}

// ---------- parsing ----------

/** Strip ```json fences and any prose around the outermost JSON object. */
export function parseJsonLoose(text: string): unknown {
  const stripped = text.replace(/```(?:json)?/gi, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new AiError("No JSON object found in model output.");
  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch (err) {
    throw new AiError(`Model output is not valid JSON: ${(err as Error).message}`);
  }
}

function validate<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new AiError(`Model JSON failed validation: ${parsed.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ")}`);
  }
  return parsed.data;
}

// ---------- providers ----------

let anthropicClient: Anthropic | null = null;
let geminiClient: GoogleGenAI | null = null;

async function callAnthropic<T extends z.ZodTypeAny>(model: string, o: GenerateOptions<T>): Promise<{ data: z.infer<T>; usage: AiUsage }> {
  anthropicClient ??= new Anthropic({ maxRetries: 0 }); // retries are handled by retryWithBackoff
  let res;
  try {
    res = await anthropicClient.messages.parse({
      model,
      max_tokens: o.maxTokens ?? 16000,
      system: o.system,
      messages: [{ role: "user", content: o.user }],
      output_config: { format: zodOutputFormat(o.schema), effort: o.effort ?? "high" },
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new AiError("Anthropic rejected the API key (401).", false, 401);
    if (err instanceof Anthropic.RateLimitError) throw new AiError("Anthropic rate limit (429).", true, 429);
    if (err instanceof Anthropic.APIError) throw new AiError(`Anthropic API error ${err.status}: ${err.message}`, (err.status ?? 0) >= 500, err.status);
    throw err;
  }
  const usage = { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens };
  if (res.stop_reason === "refusal") throw new AiError("The model declined to generate this content.");
  if (res.stop_reason === "max_tokens") throw new AiError("Model output was cut off (max_tokens reached).");
  if (res.parsed_output != null) return { data: validate(o.schema, res.parsed_output), usage };
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return { data: validate(o.schema, parseJsonLoose(text)), usage };
}

async function callGemini<T extends z.ZodTypeAny>(model: string, o: GenerateOptions<T>): Promise<{ data: z.infer<T>; usage: AiUsage }> {
  geminiClient ??= new GoogleGenAI({ apiKey: env("GEMINI_API_KEY") });
  let res;
  try {
    res = await geminiClient.models.generateContent({
      model,
      contents: o.user,
      config: {
        systemInstruction: o.system,
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(o.schema),
        maxOutputTokens: o.maxTokens ?? 16000,
        temperature: 0.4,
      },
    });
  } catch (err) {
    const status = statusOf(err);
    const message = redact(String((err as Error)?.message ?? err));
    if (status === 401 || status === 403) throw new AiError(`Gemini rejected the API key (${status}).`, false, status);
    if (status === 429) throw new AiError("Gemini rate limit / quota exhausted (429).", true, 429);
    if (status !== undefined) throw new AiError(`Gemini API error ${status}: ${message}`, status >= 500, status);
    throw new AiError(`Gemini request failed: ${message}`, isRetryable(err));
  }
  const candidate = res.candidates?.[0];
  const finish = candidate?.finishReason ? String(candidate.finishReason) : "";
  if (/SAFETY|PROHIBITED|BLOCKLIST|RECITATION/.test(finish)) throw new AiError(`Gemini blocked the response (${finish}).`);
  if (finish === "MAX_TOKENS") throw new AiError("Model output was cut off (maxOutputTokens reached).");
  const text = res.text ?? "";
  if (!text.trim()) throw new AiError(`Gemini returned no text${finish ? ` (finishReason ${finish})` : ""}.`);
  const usage = { inputTokens: res.usageMetadata?.promptTokenCount ?? 0, outputTokens: res.usageMetadata?.candidatesTokenCount ?? 0 };
  return { data: validate(o.schema, parseJsonLoose(text)), usage };
}

async function callGroq<T extends z.ZodTypeAny>(model: string, o: GenerateOptions<T>): Promise<{ data: z.infer<T>; usage: AiUsage }> {
  // OpenAI-compatible chat completions with JSON mode; the schema is spelled out in the system prompt.
  const schemaText = JSON.stringify(z.toJSONSchema(o.schema));
  let res: Response;
  try {
    res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${env("GROQ_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: Math.min(o.maxTokens ?? 16000, 32000),
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${o.system}\n\nRespond with a single JSON object that validates against this JSON Schema (no prose, no code fences):\n${schemaText}` },
          { role: "user", content: o.user },
        ],
      }),
      signal: AbortSignal.timeout(120000),
    });
  } catch (err) {
    throw new AiError(`Groq request failed: ${redact(String((err as Error)?.message ?? err))}`, true);
  }
  if (res.status === 401 || res.status === 403) throw new AiError(`Groq rejected the API key (${res.status}).`, false, res.status);
  if (res.status === 429) throw new AiError("Groq rate limit (429).", true, 429);
  if (!res.ok) throw new AiError(`Groq API error ${res.status}: ${redact((await res.text()).slice(0, 300))}`, res.status >= 500, res.status);
  const json = (await res.json()) as { choices?: { message?: { content?: string }; finish_reason?: string }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  const choice = json.choices?.[0];
  const text = choice?.message?.content ?? "";
  if (choice?.finish_reason === "length") throw new AiError("Model output was cut off (max_tokens reached).");
  if (!text.trim()) throw new AiError("Groq returned no text.");
  const usage = { inputTokens: json.usage?.prompt_tokens ?? 0, outputTokens: json.usage?.completion_tokens ?? 0 };
  return { data: validate(o.schema, parseJsonLoose(text)), usage };
}

function callProvider<T extends z.ZodTypeAny>(provider: AiProvider, model: string, o: GenerateOptions<T>) {
  if (provider === "anthropic") return callAnthropic(model, o);
  if (provider === "gemini") return callGemini(model, o);
  return callGroq(model, o);
}

/** A rate limit that survived the retries (429 from the primary provider). Pure. */
export function shouldFallbackToGroq(err: unknown): boolean {
  return (err instanceof AiError && err.status === 429) || statusOf(err) === 429;
}

/**
 * Run `primary`; if it fails with a fallback-worthy error and a fallback exists, run that instead.
 * Any other error, or a fallback failure, propagates (the fallback's error, so the log shows what happened last).
 */
export async function withFallback<T>(primary: () => Promise<T>, fallback: (() => Promise<T>) | null, isFallbackError: (err: unknown) => boolean): Promise<{ value: T; usedFallback: boolean }> {
  try {
    return { value: await primary(), usedFallback: false };
  } catch (err) {
    if (!fallback || !isFallbackError(err)) throw err;
    console.warn(`[ai] primary provider failed with a rate limit after retries; falling back to Groq (${redact(String((err as Error)?.message ?? err)).slice(0, 120)})`);
    return { value: await fallback(), usedFallback: true };
  }
}

// ---------- public entry point ----------

/** One schema-constrained call on the configured provider, with backoff on transient failures. */
export async function generateStructured<T extends z.ZodTypeAny>(o: GenerateOptions<T>): Promise<AiResult<z.infer<T>>> {
  const provider = resolveProvider();
  const model = resolveModel(provider);
  if (!isAiConfigured(provider)) {
    const keyName = provider === "anthropic" ? "ANTHROPIC_API_KEY" : provider === "gemini" ? "GEMINI_API_KEY" : "GROQ_API_KEY";
    throw new AiError(`${keyName} is not set (AI_PROVIDER=${provider}). Add it to .env before running the pipeline.`);
  }
  let attempts = 0;
  const primary = async () => {
    const r = await retryWithBackoff(() => callProvider(provider, model, o));
    attempts = r.attempts;
    return r.value;
  };
  const canFallback = provider !== "groq" && isFallbackConfigured();
  const fallbackModel = resolveModel("groq");
  const fallback = canFallback
    ? async () => {
        const r = await retryWithBackoff(() => callGroq(fallbackModel, o), { maxAttempts: 3 });
        attempts += r.attempts;
        return r.value;
      }
    : null;
  const { value, usedFallback } = await withFallback(primary, fallback, shouldFallbackToGroq);
  return { ...value, provider: usedFallback ? "groq" : provider, model: usedFallback ? fallbackModel : model, attempts, usedFallback };
}
