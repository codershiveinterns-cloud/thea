import Link from "next/link";

/** Consistent section header: display-face title, optional description, right-aligned "All … →" link. */
export function SectionHeading({ id, title, description, href, linkLabel }: { id: string; title: string; description?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-line pb-3">
      <div className="max-w-2xl">
        <h2 id={id} className="font-display text-2xl font-bold tracking-tight text-fg">
          {href ? (
            <Link href={href} className="hover:text-accent">
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        {description ? <p className="mt-1 text-sm leading-6 text-fg-muted">{description}</p> : null}
      </div>
      {href && linkLabel ? (
        <Link href={href} className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline">
          {linkLabel} <span aria-hidden="true">&nbsp;→</span>
        </Link>
      ) : null}
    </div>
  );
}
