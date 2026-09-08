import { VersionTag } from "@/components/site/post-card";

/** "Affects" badge row from the post's structured affectedBuilds field. Renders nothing when empty. */
export function AffectedBuilds({ builds }: { builds: string[] }) {
  if (builds.length === 0) return null;
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-fg-muted">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
          <path d="M2.5 4.2 9.3 3.3v6.2H2.5zM10.3 3.2 17.5 2.2v7.3h-7.2zM2.5 10.5h6.8v6.2l-6.8-.9zM10.3 10.5h7.2v7.3l-7.2-1z" />
        </svg>
        Affects
      </span>
      <ul aria-label="Affected Windows versions" className="flex flex-wrap gap-1.5">
        {builds.map((b) => (
          <li key={b}>
            <VersionTag label={b} />
          </li>
        ))}
      </ul>
    </div>
  );
}
