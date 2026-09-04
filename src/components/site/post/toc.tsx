/**
 * "On this page" jump list. Ids come from bodyHeadings(), which mirrors the
 * Markdown renderer's heading ids, so every link resolves. Hidden when there are
 * fewer than two sections (nothing to jump between).
 */
export function Toc({ headings }: { headings: { id: string; text: string }[] }) {
  if (headings.length < 2) return null;
  return (
    <nav aria-label="On this page" className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">On this page</p>
      <ol className="mt-1 list-decimal pl-5 text-sm marker:text-zinc-500">
        {headings.map((h) => (
          <li key={h.id}>
            <a href={`#${h.id}`} className="block break-words py-2 leading-7 font-medium text-blue-700 hover:underline">
              {plainHeading(h.text)}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Plain-text label for a raw markdown heading line. bodyHeadings() returns the
 * heading source verbatim, so inline code, emphasis and link syntax would otherwise
 * show up literally (backticks, asterisks) in the jump list while the body heading
 * renders formatted. Only the label goes through this — ids stay as computed.
 */
export function plainHeading(raw: string): string {
  // Park backslash-escaped characters first so they are neither read as syntax nor lost.
  const parked = raw.replace(/\\([\\`*_{}[\]()#+\-.!~<>|])/g, (_, c: string) => `\uE000${c.charCodeAt(0)}\uE000`);
  return (
    parked
      // ![alt](src) → alt, [text](url) → text
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // `code` → code (a run of N backticks closes with the same run, as in CommonMark)
      .replace(/(`+)(.*?)\1/g, "$2")
      // **bold**, __bold__ (underscore form only at word boundaries, as in CommonMark)
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/(?<![A-Za-z0-9])__(.+?)__(?![A-Za-z0-9])/g, "$1")
      // *italic*, _italic_
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/(?<![A-Za-z0-9])_(.+?)_(?![A-Za-z0-9])/g, "$1")
      // ~~strike~~ (GFM)
      .replace(/~~(.+?)~~/g, "$1")
      // inline HTML is dropped by the renderer (skipHtml)
      .replace(/<\/?[A-Za-z][^>]*>/g, "")
      // restore the parked characters as literals
      .replace(/\uE000(\d+)\uE000/g, (_, code: string) => String.fromCharCode(Number(code)))
      .replace(/\s+/g, " ")
      .trim()
  );
}
