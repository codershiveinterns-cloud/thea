/**
 * Quality gate: a deterministic identifier/structure check plus a second model call
 * scoring accuracy vs sources, structure, thinness and hallucinated identifiers (0–100).
 */
import { z } from "zod";
import { generateStructured, type AiUsage } from "@/lib/ai";
import { FAQ_MIN } from "@/lib/constants";
import { validateBodyStructure, type StructureKind } from "@/lib/post-structure";
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
export function structureProblems(post: GeneratedPost, kind: StructureKind = "fix"): string[] {
  const problems: string[] = validateBodyStructure(post.body, kind);
  if (post.faq.length < FAQ_MIN) problems.push(`Only ${post.faq.length} FAQ items`);
  if (post.body.split(/\s+/).length < 700) problems.push("Body under 700 words (thin)");
  return problems;
}

/**
 * The publish decision (CLAUDE.md step 9). With AUTO_PUBLISH on, every post is published unless the
 * identifier check failed or its score is below Setting MIN_QUALITY_SCORE (default 0 = no score floor). Pure.
 */
export function decidePublish(input: { autoPublish: boolean; score: number; flaggedIdentifiers: string[]; minScore?: number }): "PUBLISHED" | "REVIEW" {
  if (!input.autoPublish) return "REVIEW";
  if (input.flaggedIdentifiers.length > 0) return "REVIEW";
  return input.score >= (input.minScore ?? 0) ? "PUBLISHED" : "REVIEW";
}

export async function qualityGate(post: GeneratedPost, sourcesText: string, kind: StructureKind = "fix"): Promise<QualityResult> {
  const text = postToText(post);
  const deterministic = identifiersNotInSources(text, sourcesText);
  const problems = structureProblems(post, kind);
  const { data, usage } = await generateStructured({
    schema: qualityOutput,
    effort: "medium",
    maxTokens: 4000,
    system:
      "You are a strict fact-checker for a Windows help site. Score the ARTICLE 0–100 against the SOURCES. Deduct heavily for: any claim, KB number, build number or error code not supported by the sources (list every such identifier in hallucinatedIdentifiers); steps that are vague or wrong; missing structure (the required H2s for this article type are listed under KNOWN STRUCTURE PROBLEMS when absent; the FAQ is a separate structured field shown after the ARTICLE body, so do not expect an FAQ heading in the body); thin or repetitive content; marketing fluff. 85+ means publishable as-is. Return only JSON.",
    user: `ARTICLE:\n${text}\n\nSOURCES:\n${sourcesText}${problems.length ? `\n\nKNOWN STRUCTURE PROBLEMS: ${problems.join("; ")}` : ""}`,
  });
  const score = Math.max(0, Math.min(100, Math.round(data.score)));
  const flagged = Array.from(new Set([...deterministic, ...data.hallucinatedIdentifiers.map((s) => s.trim()).filter(Boolean)]));
  const notes = [data.notes.trim(), problems.length ? `Structure: ${problems.join("; ")}` : "", flagged.length ? `Unsupported identifiers: ${flagged.join(", ")}` : ""].filter(Boolean).join("\n");
  return { score, notes, flaggedIdentifiers: flagged, passes: flagged.length === 0, usage };
}
