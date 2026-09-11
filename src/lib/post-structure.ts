/**
 * Per-category post structures (CLAUDE.md "Post structure"). One source of truth used by the
 * generator prompt, the generated-post validator, the quality gate, the publish check and the
 * editor's hints. Pure and client-safe.
 *
 *   release (windows-updates): Quick answer · Highlights · Known issues · Should you install it · How to get it · FAQ
 *   fix (update-problems, error-codes, app-not-working): Quick answer · Method 1..N · If nothing worked · FAQ
 *   howto (how-to): Quick answer · Steps · What it changes · Undo · FAQ
 *
 * Quick answer and FAQ are structured fields; the H2s below live in the markdown body.
 */
import { splitH2Sections } from "./post-utils";

export type StructureKind = "release" | "fix" | "howto";

export function structureFor(categorySlug: string): StructureKind {
  if (categorySlug === "windows-updates") return "release";
  if (categorySlug === "how-to") return "howto";
  return "fix";
}

export const MIN_HIGHLIGHTS = 5;
export const MIN_METHODS = 3;

type Spec = {
  label: string;
  /** Human-readable list of the required H2s, in order. */
  headings: string[];
  /** Rules appended to the generation system prompt. */
  promptRules: string;
  /** Starter markdown for the editor's "Insert template". */
  template: string;
};

export const STRUCTURE_SPECS: Record<StructureKind, Spec> = {
  release: {
    label: "Release coverage",
    headings: ["Highlights", "Known issues", "Should you install it?", "How to get it"],
    promptRules: `Body H2s, in this exact order:
- "## Highlights" — a bullet list of at least ${MIN_HIGHLIGHTS} specific changes copied from the KB article's Improvements section (one change per bullet, concrete: name the feature, app or component and what changed). Never pad with generic "quality improvements" lines.
- "## Known issues" — every issue from the KB article's Known issues section, each as a bullet with symptom and Microsoft's workaround or status. If the article lists none, write one sentence saying Microsoft reports no known issues for this update.
- "## Should you install it?" — 1–2 short paragraphs: who benefits, who should wait, whether it is optional (preview) or mandatory (security).
- "## How to get it" — numbered steps for Windows Update, plus the Microsoft Update Catalog route.`,
    template: [
      "One or two sentences: which update this is, the date, the builds and versions it applies to, and whether it is optional or mandatory.",
      "",
      "## Highlights",
      "",
      "- Change 1 — from the KB article's Improvements section.",
      "- Change 2",
      "- Change 3",
      "- Change 4",
      "- Change 5",
      "",
      "## Known issues",
      "",
      "- Symptom — Microsoft's workaround or status.",
      "",
      "## Should you install it?",
      "",
      "Who benefits, who should wait, optional vs mandatory.",
      "",
      "## How to get it",
      "",
      "1. Settings > Windows Update > Check for updates.",
      "2. Or download it from the Microsoft Update Catalog.",
      "",
    ].join("\n"),
  },
  fix: {
    label: "Fix guide",
    headings: ["Method 1: …", "Method 2: …", "Method 3: …", "If nothing worked"],
    promptRules: `Body H2s, in this exact order: "## Method 1: …", "## Method 2: …", "## Method 3: …" (at least ${MIN_METHODS} methods, up to 6, each with numbered steps saying exactly where to click and what the screen shows, plus a sentence on when to use that method and what to expect afterwards), and finally "## If nothing worked".`,
    template: [
      "One or two sentences on what the problem is, when it appears, and who it affects.",
      "",
      "## Method 1: Name the quickest fix",
      "",
      "1. First step — say where to click and what the screen should show.",
      "2. Second step.",
      "3. Restart and check whether the problem is gone.",
      "",
      "## Method 2: Name the next fix",
      "",
      "1. First step.",
      "2. Second step.",
      "",
      "## Method 3: Name the last-resort fix",
      "",
      "1. First step.",
      "",
      "## If nothing worked",
      "",
      "What to try as a last resort, and when to wait for a fix from Microsoft.",
      "",
    ].join("\n"),
  },
  howto: {
    label: "How-to guide",
    headings: ["Steps", "What it changes", "Undo"],
    promptRules: `Body H2s, in this exact order:
- "## Steps" — one numbered list, each step a single action with exactly where to click and what the screen shows (Settings path first; mention Group Policy, Registry or PowerShell alternatives only if the sources describe them).
- "## What it changes" — what the setting or feature does once enabled/disabled, who it affects, and which build introduced it if the sources say.
- "## Undo" — numbered steps to reverse the change.`,
    template: [
      "One or two sentences: what the feature or setting is and why someone would change it.",
      "",
      "## Steps",
      "",
      "1. Open Settings > … ",
      "2. …",
      "",
      "## What it changes",
      "",
      "What happens after the change and who it affects.",
      "",
      "## Undo",
      "",
      "1. Reverse step.",
      "",
    ].join("\n"),
  },
};

function h2Matches(heading: string, prefix: string): boolean {
  return heading.trim().toLowerCase().startsWith(prefix.toLowerCase());
}

function listItemCount(content: string): number {
  return (content.match(/^\s*(?:[-*+]|\d+[.)])\s+\S/gm) ?? []).length;
}

/** Problems with a body's structure for the given kind. Empty array = OK. */
export function validateBodyStructure(body: string, kind: StructureKind): string[] {
  const { sections } = splitH2Sections(body);
  const find = (prefix: string) => sections.find((s) => h2Matches(s.heading, prefix));
  const problems: string[] = [];
  if (/^#\s/m.test(body)) problems.push("Body contains an H1 (the title is the H1).");

  if (kind === "release") {
    const highlights = find("Highlights");
    if (!highlights) problems.push('Missing "## Highlights".');
    else if (listItemCount(highlights.content) < MIN_HIGHLIGHTS) problems.push(`"## Highlights" needs at least ${MIN_HIGHLIGHTS} specific changes as list items.`);
    if (!find("Known issues")) problems.push('Missing "## Known issues".');
    if (!find("Should you install")) problems.push('Missing "## Should you install it?".');
    if (!find("How to get it")) problems.push('Missing "## How to get it".');
    return problems;
  }
  if (kind === "howto") {
    const steps = find("Steps");
    if (!steps) problems.push('Missing "## Steps".');
    else if (listItemCount(steps.content) < 2) problems.push('"## Steps" needs a numbered list of at least two steps.');
    if (!find("What it changes")) problems.push('Missing "## What it changes".');
    if (!find("Undo") && !find("How to undo")) problems.push('Missing "## Undo".');
    return problems;
  }
  const methods = sections.filter((s) => /^Method\s+\d+/i.test(s.heading));
  if (methods.length < MIN_METHODS) problems.push(`Only ${methods.length} "Method N:" section${methods.length === 1 ? "" : "s"} (need ${MIN_METHODS}+).`);
  if (!methods.some((s) => /^Method\s+1\b/i.test(s.heading))) problems.push('Missing "## Method 1: …".');
  if (!find("If nothing worked")) problems.push('Missing "## If nothing worked".');
  return problems;
}

// ---------- sentence case ----------

const KEEP_WORDS = new Set(
  [
    "Windows", "Microsoft", "Copilot", "Insider", "Explorer", "Edge", "Outlook", "Teams", "OneDrive", "Defender", "Xbox", "PowerShell",
    "Office", "Excel", "PowerPoint", "OneNote", "Google", "Chrome", "Intel", "AMD", "Nvidia", "Bluetooth", "Wi-Fi", "Notepad", "Android",
    "iPhone", "Mac", "Linux", "Surface", "Arm", "Azure", "Entra", "Intune", "Hyper-V", "BitLocker", "Recall", "Snipping",
    // Month names are proper nouns and must stay capitalised regardless of title-case position
    // (dated titles like "Insider builds (8 September 2026)" were being lower-cased to "september").
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
  ].map((w) => w.toLowerCase()),
);
/** Words that stay capitalised only when they follow a product name (Windows Update, Microsoft Store, Windows Hello…). */
const PRODUCT_PREFIX = new Set(["windows", "microsoft"]);

/**
 * Convert a Title Case headline to sentence case: first word and proper nouns/acronyms/identifiers keep
 * their capitals, everything else is lower-cased. Titles that are not Title Case are returned unchanged
 * apart from capitalising the first letter.
 */
export function sentenceCase(title: string): string {
  const words = title.trim().split(/(\s+)/); // keep whitespace tokens
  // Identifiers and acronyms (KB5120998, 25H2, DISM) are neutral when judging whether a title is Title Case.
  const real = words.filter((w, i) => i > 0 && w.trim() && !/\d/.test(w) && !(w.length > 1 && w === w.toUpperCase()));
  const capitalised = real.filter((w) => /^[A-Z][a-z]/.test(w)).length;
  const isTitleCase = real.length >= 2 && capitalised / real.length >= 0.6;
  return words
    .map((w, i, arr) => {
      if (!w.trim()) return w;
      if (i === 0) return w.charAt(0).toUpperCase() + w.slice(1);
      if (!isTitleCase) return w;
      const bare = w.replace(/[^A-Za-z0-9'’-]/g, "");
      const prev = (arr[i - 2] ?? "").replace(/[^A-Za-z]/g, "").toLowerCase();
      if (!bare || /\d/.test(bare) || (bare.length > 1 && bare === bare.toUpperCase()) || KEEP_WORDS.has(bare.toLowerCase()) || PRODUCT_PREFIX.has(prev)) return w;
      if (/^[A-Z][a-z]/.test(w)) return w.charAt(0).toLowerCase() + w.slice(1);
      return w;
    })
    .join("");
}
