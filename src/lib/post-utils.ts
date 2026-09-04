/** Pure helpers over post content. No DB access — safe to use in client components. */

export type MarkdownSection = {
  /** Heading text without the leading "## " */
  heading: string;
  /** 0-based index among H2 sections */
  index: number;
  /** Line range in the original body (inclusive start, exclusive end) */
  start: number;
  end: number;
  content: string;
};

/** Split a markdown body into H2 sections. Text before the first H2 is returned as `intro`. */
export function splitH2Sections(body: string): { intro: string; sections: MarkdownSection[] } {
  const lines = body.split(/\r?\n/);
  const starts: { line: number; heading: string }[] = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^```/.test(line)) inFence = !inFence;
    if (inFence) return;
    const m = /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (m && !/^###/.test(line)) starts.push({ line: i, heading: m[1] });
  });
  const intro = lines.slice(0, starts[0]?.line ?? lines.length).join("\n").trim();
  const sections = starts.map((s, idx) => {
    const end = starts[idx + 1]?.line ?? lines.length;
    return {
      heading: s.heading,
      index: idx,
      start: s.line,
      end,
      content: lines.slice(s.line + 1, end).join("\n").trim(),
    };
  });
  return { intro, sections };
}

/** Replace the content of one H2 section (keeps the heading line). */
export function replaceH2Section(body: string, index: number, newContent: string): string {
  const lines = body.split(/\r?\n/);
  const { sections } = splitH2Sections(body);
  const s = sections[index];
  if (!s) return body;
  const before = lines.slice(0, s.start + 1);
  const after = lines.slice(s.end);
  return [...before, "", newContent.trim(), "", ...after].join("\n").replace(/\n{3,}/g, "\n\n");
}

export function wordCount(text: string): number {
  return (text.match(/[A-Za-z0-9À-ɏ]+(?:'[a-z]+)?/g) ?? []).length;
}

export function readingTimeMinutes(text: string): number {
  return Math.max(1, Math.round(wordCount(text) / 220));
}

const STOP = new Set(
  "a an the and or of to in on for with how fix not is it my your after before when why what does do can into from vs at by be".split(" "),
);

export function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9x ]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP.has(t)),
  );
}

export type RelatedCandidate = { id: string; title: string; categoryId: string; status?: string };

/**
 * Rank candidate posts for the "related posts" picker: same category first,
 * then Jaccard similarity of title tokens. Returns up to `limit` ids in order.
 */
export function suggestRelatedPosts<T extends RelatedCandidate>(
  post: { id?: string; title: string; categoryId: string },
  candidates: T[],
  limit = 5,
): T[] {
  const mine = titleTokens(post.title);
  return candidates
    .filter((c) => c.id !== post.id)
    .map((c) => {
      const theirs = titleTokens(c.title);
      let inter = 0;
      mine.forEach((t) => theirs.has(t) && inter++);
      const union = mine.size + theirs.size - inter || 1;
      const jaccard = inter / union;
      const score = (c.categoryId === post.categoryId ? 0.5 : 0) + jaccard + (c.status === "PUBLISHED" ? 0.1 : 0);
      return { c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.c);
}
