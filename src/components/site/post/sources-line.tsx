import { POST_IDS } from "./ids";

/** Short display label for a source URL: host plus a trimmed path. */
export function sourceLabel(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname.replace(/\/$/, "");
    const short = path.length > 48 ? `${path.slice(0, 45)}…` : path;
    return `${host}${short}`;
  } catch {
    return url;
  }
}

/** "Sources" line above the FAQ: the Microsoft pages the article was generated from. */
export function SourcesLine({ urls }: { urls: string[] }) {
  const list = Array.from(new Set(urls.filter((u) => /^https?:\/\//.test(u))));
  if (list.length === 0) return null;
  return (
    <section aria-labelledby={POST_IDS.sources} className="mt-12 rounded-xl border border-line bg-bg-2 px-5 py-4 text-sm">
      <h2 id={POST_IDS.sources} className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
        Sources
      </h2>
      <ul className="mt-2 space-y-1">
        {list.map((u) => (
          <li key={u} className="min-w-0">
            <a href={u} rel="noopener nofollow" target="_blank" className="break-all font-medium text-accent underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent">
              {sourceLabel(u)}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
