/**
 * Thin wrapper over the Anthropic SDK used by the pipeline.
 * Model comes from ANTHROPIC_MODEL (default claude-opus-5); key from ANTHROPIC_API_KEY. Never hardcode either.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

export const AI_MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5";

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim() || process.env.ANTHROPIC_AUTH_TOKEN?.trim());
}

export class AiError extends Error {}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ maxRetries: 3 });
  return client;
}

export type AiUsage = { inputTokens: number; outputTokens: number };

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

/**
 * One structured-output call. Uses the SDK's parse() helper so the response is
 * schema-constrained; falls back to lenient parsing of the text if parsed_output is empty.
 */
export async function generateStructured<T extends z.ZodTypeAny>(opts: {
  schema: T;
  system: string;
  user: string;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}): Promise<{ data: z.infer<T>; usage: AiUsage }> {
  if (!isAiConfigured()) {
    throw new AiError("ANTHROPIC_API_KEY is not set. Add it to .env before running the pipeline.");
  }
  let res;
  try {
    res = await getClient().messages.parse({
      model: AI_MODEL,
      max_tokens: opts.maxTokens ?? 16000,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
      output_config: { format: zodOutputFormat(opts.schema), effort: opts.effort ?? "high" },
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new AiError("Anthropic rejected the API key (401).");
    if (err instanceof Anthropic.RateLimitError) throw new AiError("Anthropic rate limit hit (429). Try again later.");
    if (err instanceof Anthropic.APIError) throw new AiError(`Anthropic API error ${err.status}: ${err.message}`);
    throw err;
  }
  const usage: AiUsage = { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens };
  if (res.stop_reason === "refusal") throw new AiError("The model declined to generate this content.");
  if (res.stop_reason === "max_tokens") throw new AiError("Model output was cut off (max_tokens reached).");
  if (res.parsed_output != null) return { data: res.parsed_output as z.infer<T>, usage };
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const parsed = opts.schema.safeParse(parseJsonLoose(text));
  if (!parsed.success) {
    throw new AiError(`Model JSON failed validation: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  return { data: parsed.data, usage };
}
