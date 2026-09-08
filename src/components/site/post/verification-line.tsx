import { formatDate } from "@/lib/dates";

/** "Tested on / Last verified / By" line. Until a human sets testedOnBuild, the post honestly shows "pending". */
export function VerificationLine({ testedOnBuild, lastVerifiedAt, authorName }: { testedOnBuild: string | null; lastVerifiedAt: Date | null; authorName: string }) {
  const build = testedOnBuild?.trim();
  if (!build) {
    return (
      <p className="mt-12 flex items-start gap-2.5 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm leading-6 text-warn">
        <ClockIcon />
        <span>
          <strong className="font-semibold">Verified: pending</strong> — this guide is awaiting a hands-on check on a current build.
        </span>
      </p>
    );
  }
  return (
    <p className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-ok/30 bg-ok-soft px-4 py-3 text-sm leading-6 text-ok">
      <span className="inline-flex items-center gap-1.5 font-semibold">
        <CheckIcon />
        Verified
      </span>
      <span>
        Tested on <strong className="font-semibold">{build}</strong>
      </span>
      {lastVerifiedAt ? (
        <span>
          Last verified <time dateTime={lastVerifiedAt.toISOString()}>{formatDate(lastVerifiedAt)}</time>
        </span>
      ) : null}
      <span>By {authorName}</span>
    </p>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="mt-1 h-4 w-4 shrink-0">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6v4l2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
