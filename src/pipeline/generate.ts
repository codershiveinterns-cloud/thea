/**
 * Generation step. System prompt = post structure (CLAUDE.md) + author style.
 * The API call is schema-constrained (loose shape); the result is then validated strictly.
 */
import { z } from "zod";
import { generateStructured, type AiUsage } from "@/lib/ai";
import { FAQ_MAX, FAQ_MIN } from "@/lib/constants";
import { STRUCTURE_SPECS, sentenceCase, structureFor, validateBodyStructure, type StructureKind } from "@/lib/post-structure";
import { slugify } from "@/lib/slug";
import { faqItemSchema } from "@/lib/validation";

/** Hard floor enforced after generation (the prompt asks for 700+). */
export const MIN_BODY_WORDS = 600;

/** Loose shape sent to the API as the output format (structured outputs support a JSON-schema subset). */
export const generatedPostOutput = z.object({
  title: z.string(),
  slug: z.string(),
  quickAnswer: z.string(),
  body: z.string(),
  affectedBuilds: z.array(z.string()),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })),
  metaTitle: z.string(),
  metaDescription: z.string(),
  internalLinkSuggestions: z.array(z.string()),
});

/** Strict validation applied after the call. */
export const generatedPostSchema = z.object({
  title: z.string().trim().min(10).max(120),
  slug: z.string().trim().transform((s) => slugify(s)).pipe(z.string().min(3)),
  quickAnswer: z.string().trim().min(40).max(600),
  body: z
    .string()
    .trim()
    .min(400)
    .refine((b) => b.split(/\s+/).length >= MIN_BODY_WORDS, `Body must be at least ${MIN_BODY_WORDS} words`)
    .refine((b) => !/<\/?[a-z][^>]*>/i.test(b), "Body must be markdown without raw HTML"),
  affectedBuilds: z.array(z.string().trim().min(2)).max(8),
  faq: z.array(faqItemSchema).min(FAQ_MIN).max(FAQ_MAX),
  metaTitle: z.string().trim().min(10).max(70),
  metaDescription: z.string().trim().min(40).max(170),
  internalLinkSuggestions: z.array(z.string().trim().min(3)).max(8),
});
export type GeneratedPost = z.infer<typeof generatedPostSchema>;

export function postStructureRules(kind: StructureKind): string {
  return `Every article follows this exact structure:
- title: the target keyword phrased naturally, in sentence case (capitalise only the first word, proper nouns and identifiers like KB5065426 or Windows 11). This becomes the H1; do not repeat it as a heading in the body.
- quickAnswer: 2–3 sentences that answer the title outright.
- body: markdown only, no HTML, at least 700 words (aim for 800–1200). Start with one or two paragraphs that say what this is, who it affects and why it matters. Never use H1 (#) in the body. ${STRUCTURE_SPECS[kind].promptRules}
- affectedBuilds: the Windows versions/builds the article applies to, copied from the sources (e.g. "Windows 11 24H2", "Build 26100.6584").
- faq: ${FAQ_MIN}–${FAQ_MAX} questions a reader would type into Google, each answered in 1–3 sentences.
- metaTitle (≤ 70 chars, sentence case) and metaDescription (≤ 170 chars) for search results.
- internalLinkSuggestions: 3–5 short titles of related articles a reader would want next.`;
}

export const FACT_RULES = `Facts: you may only state facts that appear in the SOURCES section. Every KB number, build number, version and error code you write must be copied from the sources verbatim — never invent or guess one, and if the sources do not name one, do not name one. If the sources do not support a step, describe it generically (e.g. "run the Windows Update troubleshooter") rather than inventing specifics. Never mention that you are an AI or refer to "the sources" in the article text.`;

export type GenerationInput = {
  phrase: string;
  categorySlug: string;
  categoryName: string;
  author: { name: string; stylePrompt: string };
  sourcesText: string;
  existingTitles: string[];
};

export function buildSystemPrompt(author: { name: string; stylePrompt: string }, kind: StructureKind = "fix"): string {
  return [
    "You write for Thea, a site that publishes same-day coverage of Windows updates and step-by-step fixes for Windows 11 problems. Readers are ordinary Windows users, not IT pros.",
    postStructureRules(kind),
    FACT_RULES,
    `Author voice (${author.name}): ${author.stylePrompt}`,
    "Return only the JSON object.",
  ].join("\n\n");
}

export function buildUserPrompt(input: GenerationInput): string {
  const titles = input.existingTitles.slice(0, 40).map((t) => `- ${t}`).join("\n") || "- (none yet)";
  return [
    `TARGET KEYWORD: ${input.phrase}`,
    `CATEGORY: ${input.categoryName} (${input.categorySlug})`,
    `EXISTING ARTICLES ON THE SITE (for internalLinkSuggestions — prefer these titles when relevant):\n${titles}`,
    `SOURCES:\n${input.sourcesText}`,
  ].join("\n\n");
}

export async function generatePost(input: GenerationInput): Promise<{ post: GeneratedPost; usage: AiUsage }> {
  const kind = structureFor(input.categorySlug);
  const { data, usage } = await generateStructured({
    schema: generatedPostOutput,
    system: buildSystemPrompt(input.author, kind),
    user: buildUserPrompt(input),
    maxTokens: 16000,
  });
  const strict = generatedPostSchema.safeParse(data);
  if (!strict.success) {
    throw new Error(`Generated post failed validation: ${strict.error.issues.map((i) => `${i.path.join(".") || "post"}: ${i.message}`).join("; ")}`);
  }
  const structure = validateBodyStructure(strict.data.body, kind);
  if (structure.length) throw new Error(`Generated post failed structure check (${kind}): ${structure.join(" ")}`);
  const post = { ...strict.data, title: sentenceCase(strict.data.title), metaTitle: sentenceCase(strict.data.metaTitle) };
  return { post, usage };
}

// ---------- Regenerate one H2 section (editor button) ----------

const sectionOutput = z.object({ content: z.string() });

export async function generateSection(input: {
  heading: string;
  currentContent: string;
  postTitle: string;
  quickAnswer: string;
  otherHeadings: string[];
  author: { name: string; stylePrompt: string };
  sourcesText: string;
}): Promise<{ content: string; usage: AiUsage }> {
  const system = [
    "You rewrite one section of a Windows 11 fix article for Thea. Return only the markdown that goes UNDER the given H2 heading — no heading line, no HTML, no H1.",
    "Numbered steps must say exactly where to click and what the screen shows. Keep it tight: 40–200 words unless the section is 'If nothing worked' (30–120 words).",
    FACT_RULES,
    `Author voice (${input.author.name}): ${input.author.stylePrompt}`,
  ].join("\n\n");
  const user = [
    `ARTICLE TITLE: ${input.postTitle}`,
    `QUICK ANSWER: ${input.quickAnswer}`,
    `OTHER SECTIONS: ${input.otherHeadings.join(" | ") || "(none)"}`,
    `SECTION TO REWRITE: ${input.heading}`,
    `CURRENT CONTENT:\n${input.currentContent || "(empty)"}`,
    `SOURCES:\n${input.sourcesText || "(no sources fetched — keep the steps generic and do not name identifiers)"}`,
  ].join("\n\n");
  const { data, usage } = await generateStructured({ schema: sectionOutput, system, user, maxTokens: 4000, effort: "medium" });
  const content = data.content.trim().replace(/^#+\s.*\n?/m, "").trim();
  if (content.length < 30) throw new Error("Regenerated section came back empty.");
  if (/<\/?[a-z][^>]*>/i.test(content)) throw new Error("Regenerated section contained HTML; discarded.");
  return { content, usage };
}
