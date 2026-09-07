/**
 * Quality gate: a deterministic identifier/structure check plus a second model call
 * scoring accuracy vs sources, structure, thinness and hallucinated identifiers (0–100).
 */
import { z } from "zod";
import { generateStructured, type AiUsage } from "@/lib/ai";
import { FAQ_MIN, QUALITY_GATE_MIN } from "@/lib/constants";
import { identifiersNotInSources } from "./extract";
import type { GeneratedPost } from "./generate";

export type QualityResult = {
  score: number;
  notes: string;
  flaggedIdentifiers: string[];
  passes: boolean;
  usage: AiUsage;
};

const qualityOutput = z.object({
  score: z.number(),
  notes: z.string(),
  hallucinatedIdentifiers: z.array(z.string()),
});

export function postToText(post: GeneratedPost): string {
  return [post.title, post.quickAnswer, post.body, ...post.affectedBuilds, ...post.faq.flatMap((f) => [f.question, f.answer]), post.metaTitle, post.metaDescription].join("\n");
}

/** Cheap structural problems found without a model. Pure. */
export function structureProblems(post: GeneratedPost): string[] {
  const problems: string[] = [];
  const methods = post.body.match(/^##\s+Method\s+\d+/gm) ?? [];
  if (methods.length < 1) problems.push('No "## Method 1:" heading');
  if (!/^##\s+If nothing worked/m.test(post.body)) problems.push('No "## If nothing worked" section');
  if (post.faq.length < FAQ_MIN) problems.push(`Only ${post.faq.length} FAQ items`);
  if (post.body.split(/\s+/).length < 250) problems.push("Body under 250 words (thin)");
  if (/^#\s/m.test(post.body)) problems.push("Body contains an H1");
  return problems;
}

/** The publish decision from CLAUDE.md step 9. Pure. */
export function decidePublish(input: { autoPublish: boolean; score: number; flaggedIdentifiers: string[] }): "PUBLISHED" | "REVIEW" {
  if (!input.autoPublish) return "REVIEW";
  if (input.flaggedIdentifiers.length > 0) return "REVIEW";
  return input.score >= QUALITY_GATE_MIN ? "PUBLISHED" : "REVIEW";
}

export async function qualityGate(post: GeneratedPost, sourcesText: string): Promise<QualityResult> {
  const text = postToText(post);
  const deterministic = identifiersNotInSources(text, sourcesText);
  const problems = structureProblems(post);
  const { data, usage } = await generateStructured({
    schema: qualityOutput,
    effort: "medium",
    maxTokens: 4000,
    system:
      "You are a strict fact-checker for a Windows help site. Score the ARTICLE 0–100 against the SOURCES. Deduct heavily for: any claim, KB number, build number or error code not supported by the sources (list every such identifier in hallucinatedIdentifiers); steps that are vague or wrong; missing structure (Method H2s, 'If nothing worked', FAQ); thin or repetitive content; marketing fluff. 85+ means publishable as-is. Return only JSON.",
    user: `ARTICLE:\n${text}\n\nSOURCES:\n${sourcesText}${problems.length ? `\n\nKNOWN STRUCTURE PROBLEMS: ${problems.join("; ")}` : ""}`,
  });
  const score = Math.max(0, Math.min(100, Math.round(data.score)));
  const flagged = Array.from(new Set([...deterministic, ...data.hallucinatedIdentifiers.map((s) => s.trim()).filter(Boolean)]));
  const notes = [data.notes.trim(), problems.length ? `Structure: ${problems.join("; ")}` : "", flagged.length ? `Unsupported identifiers: ${flagged.join(", ")}` : ""].filter(Boolean).join("\n");
  return { score, notes, flaggedIdentifiers: flagged, passes: score >= QUALITY_GATE_MIN && flagged.length === 0, usage };
}
