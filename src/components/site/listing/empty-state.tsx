import Link from "next/link";

type Props = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

const primary =
  "inline-flex min-h-11 items-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700";
const secondary =
  "inline-flex min-h-11 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50";

/**
 * Shown when a listing has no published posts. Carries its own h2 so the page
 * keeps a sensible heading outline without the post grid.
 */
export function EmptyState({ title, children, className = "" }: Props) {
  return (
    <section
      aria-labelledby="empty-state-heading"
      className={`rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center ${className}`}
    >
      <h2 id="empty-state-heading" className="text-xl font-semibold tracking-tight text-zinc-900">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">{children}</p>
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
