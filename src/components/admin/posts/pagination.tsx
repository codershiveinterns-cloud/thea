import { LinkButton, buttonClass } from "@/components/ui/button";
import { POSTS_PAGE_SIZE, postsListHref, type PostListParams } from "./list-params";

type Props = {
  params: PostListParams;
  /** Page actually being shown (already clamped to totalPages by the page). */
  page: number;
  totalPages: number;
  total: number;
};

/** Prev/Next links that keep every other query param. Renders nothing for a single page. */
export function PostsPagination({ params, page, totalPages, total }: Props) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * POSTS_PAGE_SIZE + 1;
  const to = Math.min(page * POSTS_PAGE_SIZE, total);
  const disabled = buttonClass("secondary", "sm", "pointer-events-none opacity-50");

  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600">
      <p>
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <LinkButton href={postsListHref({ ...params, page: page - 1 })} intent="secondary" size="sm">
            ← Prev
          </LinkButton>
        ) : (
          <span aria-disabled="true" className={disabled}>
            ← Prev
          </span>
        )}
        <span className="tabular-nums">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <LinkButton href={postsListHref({ ...params, page: page + 1 })} intent="secondary" size="sm">
            Next →
          </LinkButton>
        ) : (
          <span aria-disabled="true" className={disabled}>
            Next →
          </span>
        )}
      </div>
    </nav>
  );
}
