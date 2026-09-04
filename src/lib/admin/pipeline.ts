"use server";
/**
 * Entry points the admin UI calls into the content pipeline.
 * Phase 1 ships the buttons; phase 3 implements src/pipeline and replaces these bodies.
 */

export type PipelineRunResult = { ok: boolean; message: string; createdPostIds: string[] };

/** "Run pipeline now" button on the dashboard. */
export async function runPipelineNow(): Promise<PipelineRunResult> {
  return {
    ok: false,
    message: "The generation pipeline is not built yet (phase 3). Nothing was changed.",
    createdPostIds: [],
  };
}

export type RegenerateSectionResult = { ok: boolean; message: string; content?: string };

/** "Regenerate section" button in the editor — re-generates one H2 section's content. */
export async function regenerateSection(input: {
  postId: string;
  sectionIndex: number;
  heading: string;
}): Promise<RegenerateSectionResult> {
  return {
    ok: false,
    message: `Regenerating "${input.heading}" needs the AI pipeline (phase 3). Section left unchanged.`,
  };
}
