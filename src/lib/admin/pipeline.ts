"use server";
/**
 * Entry points the admin UI calls into the content pipeline (src/pipeline).
 */
import { logger } from "@/lib/log";
import { db } from "@/lib/db";
import { isAiConfigured } from "@/lib/ai";
import { splitH2Sections } from "@/lib/post-utils";
import { readStringArray } from "@/lib/validation";
import { generateSection } from "@/pipeline/generate";
import { research } from "@/pipeline/research";
import { runPipeline, summarizeReport } from "@/pipeline/run";
import { revalidatePath } from "next/cache";

const log = logger("admin:pipeline");

export type PipelineRunResult = { ok: boolean; message: string; createdPostIds: string[] };

/** "Run pipeline now" button on the dashboard. */
export async function runPipelineNow(): Promise<PipelineRunResult> {
  if (!isAiConfigured()) {
    return { ok: false, message: "ANTHROPIC_API_KEY is not set in .env, so nothing was generated. Feeds were not fetched either.", createdPostIds: [] };
  }
  try {
    const report = await runPipeline({ quiet: true });
    revalidatePath("/admin");
    revalidatePath("/admin/posts");
    revalidatePath("/admin/keywords");
    const ids = report.posts.map((p) => p.postId).filter((id): id is string => Boolean(id));
    const errors = report.log.filter((e) => e.level === "error").map((e) => e.message);
    return {
      ok: report.ok,
      message: `${summarizeReport(report)}${errors.length ? ` Errors: ${errors.join(" | ")}` : ""}`,
      createdPostIds: ids,
    };
  } catch (err) {
    log.error("run failed", { error: err });
    return { ok: false, message: `Pipeline failed: ${(err as Error).message}`, createdPostIds: [] };
  }
}

export type RegenerateSectionResult = { ok: boolean; message: string; content?: string };

/** "Regenerate section" button in the editor — re-generates one H2 section's content from the post's sources. */
export async function regenerateSection(input: { postId: string; sectionIndex: number; heading: string }): Promise<RegenerateSectionResult> {
  if (!isAiConfigured()) return { ok: false, message: "ANTHROPIC_API_KEY is not set in .env. Section left unchanged." };
  const post = await db.post.findUnique({ where: { id: input.postId }, include: { author: true } });
  if (!post) return { ok: false, message: "Post not found." };
  const { sections } = splitH2Sections(post.body);
  const section = sections[input.sectionIndex];
  if (!section || section.heading !== input.heading) return { ok: false, message: "Save the post first — the section list has changed." };
  try {
    const sources = await research(readStringArray(post.sourceUrls).slice(0, 5));
    const { content } = await generateSection({
      heading: section.heading,
      currentContent: section.content,
      postTitle: post.title,
      quickAnswer: post.quickAnswer,
      otherHeadings: sections.filter((s) => s.index !== section.index).map((s) => s.heading),
      author: { name: post.author.name, stylePrompt: post.author.stylePrompt },
      sourcesText: sources.combinedText,
    });
    return { ok: true, message: `Regenerated "${section.heading}" from ${sources.urls.length} source page(s). Review it, then save.`, content };
  } catch (err) {
    return { ok: false, message: `Regeneration failed: ${(err as Error).message}` };
  }
}
