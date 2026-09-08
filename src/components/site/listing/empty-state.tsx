import Link from "next/link";

type Props = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

const primary =
  "inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg hover:bg-accent-2";
const secondary =
  "inline-flex min-h-11 items-center rounded-md border border-line bg-bg px-4 text-sm font-medium text-fg-body hover:bg-bg-2";

/**
 * Shown when a listing has no published posts. Carries its own h2 so the page
 * keeps a sensible heading outline without the post grid.
 */
export function EmptyState({ title, children, className = "" }: Props) {
  return (
    <section
      aria-labelledby="empty-state-heading"
      className={`rounded-xl border border-dashed border-line bg-bg-2 px-6 py-12 text-center ${className}`}
    >
      <h2 id="empty-state-heading" className="font-display text-xl font-semibold tracking-tight text-fg">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-fg-body">{children}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className={primary}>
          Browse the latest guides
        </Link>
        <Link href="/search" className={secondary}>
          Search the site
        </Link>
      </div>
    </section>
  );
}
