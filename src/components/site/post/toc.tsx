/**
 * Table of contents. Desktop: a sticky aside beside the article. Mobile: a collapsible
 * <details> above the body. Ids come from bodyHeadings(), which mirrors the Markdown
 * renderer's heading ids, so every link resolves. Hidden with fewer than two sections.
 */
export function Toc({ headings, variant }: { headings: { id: string; text: string }[]; variant: "aside" | "inline" }) {
  if (headings.length < 2) return null;
  const list = (
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
  );

  if (variant === "aside") {
    return (
      <nav aria-label="On this page" className="hidden lg:block">
        <div className="sticky top-8 border-l border-line pl-5">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">On this page</p>
          {list}
        </div>
      </nav>
    );
  }
  return (
    <details className="group mt-8 rounded-xl border border-line bg-bg-2 px-4 py-2 lg:hidden">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-display text-sm font-semibold text-fg [&::-webkit-details-marker]:hidden">
        On this page
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-fg-muted transition-transform group-open:rotate-180">
          <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <nav aria-label="On this page" className="pb-2">
        {list}
      </nav>
    </details>
  );
}

/**
 * Plain-text label for a raw markdown heading line (inline code, emphasis and link syntax
 * would otherwise show literally). Only the label goes through this — ids stay as computed.
 */
export function plainHeading(raw: string): string {
  const SENTINEL = "\uE000";
  // Park backslash-escaped characters so they are neither read as syntax nor lost.
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
