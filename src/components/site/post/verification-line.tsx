/**
 * Neutral provenance line under the article. Public pages no longer show a "Verified: pending" badge;
 * the admin keeps testedOnBuild and its "Published — verify" queue unchanged.
 */

import { formatCheckedDate } from "@/lib/verification";

export function VerificationLine({ publishedAt, updatedAt, testedOnBuild }: { publishedAt: Date | null; updatedAt: Date; testedOnBuild: string | null }) {
  const checked = publishedAt ?? updatedAt;
  const build = testedOnBuild?.trim();
  return (
    <p className="mt-12 rounded-xl border border-line bg-bg-2 px-4 py-3 text-sm leading-6 text-fg-body">
      Checked against Microsoft&apos;s release notes on <time dateTime={checked.toISOString()}>{formatCheckedDate(checked)}</time>; re-checked when a new
      build ships.
      {build ? (
        <>
          {" "}
          Tested on build <strong className="font-semibold text-fg">{build}</strong>.
        </>
      ) : null}
    </p>
  );
}
