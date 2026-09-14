/**
 * Orchestrates the per-post illustration set: which Settings screen(s) a post is about, then
 * turning those into stored image files and inline markdown. See screens.ts for the screen
 * catalogue and svg-kit.ts/shell.ts/content.ts for the drawing primitives.
 *
 * Every image is generated locally from these hand-built SVG templates and rasterised with
 * sharp — nothing here calls an image-generation model or fetches a real screenshot.
 */
import { splitH2Sections } from "@/lib/post-utils";
import { storage } from "@/lib/storage";
import { captionFor, detectScreenForText, renderScreenSvg, DEFAULT_SCREEN, type ScreenId } from "./screens";
import { CANVAS } from "./shell";

export const FEATURED_SIZE = { width: CANVAS.width, height: CANVAS.height } as const; // 1200x630, matches the site's OG image convention
export const INLINE_SIZE = { width: 900, height: Math.round((900 * CANVAS.height) / CANVAS.width) } as const; // same 1200:630 aspect, smaller

/** Headings that actually walk a reader through a UI action — the only sections eligible for an inline illustration. */
const INSTRUCTIONAL_HEADING = /^(method\s+\d+|steps|how to get it)\b/i;

export type IllustrationPick = { screenId: ScreenId; highlight: number; sectionIndex: number };
export type IllustrationPlan = { featured: { screenId: ScreenId; highlight: number }; inline: IllustrationPick[] };

/**
 * Decide which screen(s) to draw for a post, purely from its title/body text. No I/O — safe to
 * unit test directly. Inline picks are capped at 2 and always land on an instructional H2
 * (Method N / Steps / How to get it), preferring sections that clearly name a specific screen.
 */
export function planIllustrations(input: { title: string; body: string }): IllustrationPlan {
  const { sections } = splitH2Sections(input.body);
  const instructional = sections.filter((s) => INSTRUCTIONAL_HEADING.test(s.heading.trim()));

  const detected = instructional
    .map((s) => ({ sectionIndex: s.index, screenId: detectScreenForText(`${s.heading}\n${s.content}`) }))
    .filter((d): d is { sectionIndex: number; screenId: ScreenId } => d.screenId !== null);

  const overall = detectScreenForText(`${input.title}\n${input.body.slice(0, 400)}`) ?? DEFAULT_SCREEN;

  let picks: IllustrationPick[];
  if (detected.length > 0) {
    picks = detected.slice(0, 2).map((d, i) => ({ ...d, highlight: i }));
  } else if (instructional.length > 0) {
    // Nothing named a specific screen — still show the reader *a* Settings screen, anchored to the first step.
    picks = [{ sectionIndex: instructional[0].index, screenId: overall, highlight: 0 }];
  } else {
    picks = [];
  }

  const featured = picks[0] ? { screenId: picks[0].screenId, highlight: picks[0].highlight } : { screenId: overall, highlight: 0 };
  return { featured, inline: picks };
}

async function rasterizePng(screenId: ScreenId, highlight: number, width: number, height: number): Promise<Buffer> {
  const svg = renderScreenSvg(screenId, highlight);
  // sharp is a Node-only rasteriser (SVG -> PNG); imported lazily so this module stays load-safe
  // in any context that doesn't need it (e.g. a future edge runtime import of screens.ts alone).
  const { default: sharp } = await import("sharp");
  return sharp(Buffer.from(svg)).resize(width, height).png().toBuffer();
}

async function storeIllustration(buffer: Buffer, baseName: string): Promise<string> {
  const file = new File([new Uint8Array(buffer)], `${baseName}.png`, { type: "image/png" });
  const stored = await storage.save(file, { folder: "illustrations" });
  return stored.url;
}

/** Marker left in a post's body once it has generated inline illustrations, so backfills are idempotent. */
export const ILLUSTRATION_MARKER = "Illustration:";

/**
 * Generate the full illustration set for a post: one featured/OG image, and up to two inline
 * images spliced into the body right under the relevant Method/Steps heading, each captioned
 * "Illustration: ..." (never "Screenshot"). Returns the updated body and the featured image URL.
 * Callers should treat failures as non-fatal (catch and fall back to the branded OG card).
 */
export async function generateIllustrationsForPost(input: { title: string; body: string; slug: string }): Promise<{ featuredImage: string; body: string }> {
  const plan = planIllustrations(input);

  const featuredPng = await rasterizePng(plan.featured.screenId, plan.featured.highlight, FEATURED_SIZE.width, FEATURED_SIZE.height);
  const featuredImage = await storeIllustration(featuredPng, `${input.slug}-featured`);

  // Insert from the last section to the first so earlier line numbers stay valid as we splice.
  let body = input.body;
  const byIndexDesc = [...plan.inline].sort((a, b) => b.sectionIndex - a.sectionIndex);
  for (const pick of byIndexDesc) {
    const png = await rasterizePng(pick.screenId, pick.highlight, INLINE_SIZE.width, INLINE_SIZE.height);
    const url = await storeIllustration(png, `${input.slug}-inline-${pick.sectionIndex}`);
    const caption = captionFor(pick.screenId);
    body = insertAfterHeading(body, pick.sectionIndex, `![${caption}](${url})\n\n*${caption}*`);
  }

  return { featuredImage, body };
}

/** Splice markdown right after an H2 heading line, before whatever content already follows it. */
function insertAfterHeading(body: string, sectionIndex: number, snippet: string): string {
  const lines = body.split(/\r?\n/);
  const { sections } = splitH2Sections(body);
  const s = sections[sectionIndex];
  if (!s) return body;
  const before = lines.slice(0, s.start + 1);
  const after = lines.slice(s.start + 1);
  return [...before, "", snippet.trim(), "", ...after].join("\n").replace(/\n{3,}/g, "\n\n");
}
