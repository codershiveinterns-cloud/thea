/** "Affects:" badge row from the post's structured affectedBuilds field. Renders nothing when empty. */
export function AffectedBuilds({ builds }: { builds: string[] }) {
  if (builds.length === 0) return null;
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Affects:</span>
      <ul aria-label="Affected Windows versions" className="flex flex-wrap gap-1.5">
        {builds.map((b) => (
          <li key={b} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
