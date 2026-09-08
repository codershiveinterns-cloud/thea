import Link from "next/link";
import { listingPagePath } from "./utils";

type Props = {
  /** e.g. "/error-codes" — page 1 is this path, page N is `${basePath}/page/N`. */
  basePath: string;
  page: number;
  totalPages: number;
  className?: string;
};

const linkClass =
  "inline-flex min-h-11 items-center gap-1.5 rounded-md border border-line bg-bg px-4 text-sm font-medium text-fg-body hover:bg-bg-2 hover:text-fg";

/**
 * Newer / Older links for a chronological listing. "Newer" points to the previous
 * (more recent) page with rel="prev"; "Older" to the next page with rel="next".
 * Renders nothing when there is only one page.
 */
export function Pagination({ basePath, page, totalPages, className = "" }: Props) {
  if (totalPages <= 1) return null;

  const newer = page > 1 ? listingPagePath(basePath, page - 1) : null;
  const older = page < totalPages ? listingPagePath(basePath, page + 1) : null;

  return (
    <nav aria-label="Pagination" className={`grid grid-cols-3 items-center gap-3 ${className}`}>
      <div className="justify-self-start">
        {newer ? (
          <Link href={newer} rel="prev" className={linkClass}>
            <span aria-hidden="true">←</span> Newer
          </Link>
        ) : null}
      </div>
      <p className="justify-self-center text-sm tabular-nums text-fg-muted">
        Page {page} of {totalPages}
      </p>
      <div className="justify-self-end">
        {older ? (
          <Link href={older} rel="next" className={linkClass}>
            Older <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
