/** Provenance line text for public post pages (pure; the component in components/site/post renders it). */

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "9 September 2026" */
export function formatCheckedDate(d: Date): string {
  return dateFmt.format(d);
}

export function verificationText(input: { publishedAt: Date | null; updatedAt: Date; testedOnBuild: string | null }): string {
  const date = formatCheckedDate(input.publishedAt ?? input.updatedAt);
  const base = `Checked against Microsoft's release notes on ${date}; re-checked when a new build ships.`;
  const build = input.testedOnBuild?.trim();
  return build ? `${base} Tested on build ${build}.` : base;
}
