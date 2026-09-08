/**
 * Table of contents — a single element in the DOM. On small screens it is a compact box above
 * the article; on desktop the parent grid places it in the right column, sticky. Ids come from
 * bodyHeadings(), which mirrors the Markdown renderer's heading ids. Hidden with fewer than two sections.
 */
export function Toc({ headings }: { headings: { id: string; text: string }[] }) {
  if (headings.length < 2) return null;
  return (
    <nav aria-label="On this page" className="mb-8 rounded-xl border border-line bg-bg-2 px-4 py-3 lg:sticky lg:top-8 lg:mb-0 lg:border-0 lg:border-l lg:bg-transparent lg:px-0 lg:pl-5 lg:py-0 lg:rounded-none">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">On this page</p>
      <ol className="mt-2 space-y-0.5 text-sm">
        {headings.map((h, i) => (
          <li key={h.id}>
            <a href={`#${h.id}`} className="group flex min-h-9 items-start gap-3 rounded-md py-1.5 pr-2 leading-6 text-fg-body hover:text-accent">
              <span className="w-5 shrink-0 text-right font-mono text-xs tabular-nums text-fg-muted group-hover:text-accent" aria-hidden="true">
                {i + 1}
              </span>
              <span className="min-w-0 break-words">{plainHeading(h.text)}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Plain-text label for a raw markdown heading line (inline code, emphasis and link syntax
 * would otherwise show literally). Only the label goes through this — ids stay as computed.
 */
export function plainHeading(raw: string): string {
  const SENTINEL = "\uE000";
  const parked = raw.replace(/\\([\\`*_{}[\]()#+\-.!~<>|])/g, (_, c: string) => `${SENTINEL}${c.charCodeAt(0)}${SENTINEL}`);
  return parked
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(`+)(.*?)\1/g, "$2")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(?<![A-Za-z0-9])__(.+?)__(?![A-Za-z0-9])/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/(?<![A-Za-z0-9])_(.+?)_(?![A-Za-z0-9])/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/<\/?[A-Za-z][^>]*>/g, "")
    .replace(/\uE000(\d+)\uE000/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}
