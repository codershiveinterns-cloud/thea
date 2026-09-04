import type { ReactNode } from "react";
import { breadcrumbJsonLd, jsonLdGraph } from "@/lib/seo";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";
import { JsonLd } from "./json-ld";

/**
 * Shell for the plain-content pages (/about, /contact, /editorial-policy): visible breadcrumbs
 * plus the matching BreadcrumbList JSON-LD, the page's single h1, an optional lede, and a
 * prose column so pages can be written as plain h2/p/ul markup.
 *
 * Prose contract (no typography plugin): direct-child h2/h3/p/ul/ol get the article styles,
 * and links without a class attribute get the site link style. Anything that needs its own
 * layout (cards, grids) is wrapped in a <div> and styled explicitly — the prose rules
 * deliberately don't reach inside it, so nothing has to fight specificity.
 */
const PROSE = [
  "text-[17px] leading-7 text-zinc-800",
  "[&>h2]:mt-10 [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:tracking-tight [&>h2]:text-zinc-900 [&>h2:first-child]:mt-0",
  "[&>h3]:mt-6 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-zinc-900",
  "[&>p]:my-4",
  "[&>ul]:my-4 [&>ul]:list-disc [&>ul]:space-y-2 [&>ul]:pl-6",
  "[&>ol]:my-4 [&>ol]:list-decimal [&>ol]:space-y-2 [&>ol]:pl-6",
  "[&_strong]:font-semibold [&_strong]:text-zinc-900",
  "[&_a:not([class])]:font-medium [&_a:not([class])]:text-blue-700 [&_a:not([class])]:underline [&_a:not([class])]:decoration-blue-300 [&_a:not([class])]:underline-offset-2 [&_a:not([class])]:hover:decoration-blue-700",
].join(" ");

export function StaticPage({
  title,
  intro,
  breadcrumbs,
  children,
}: {
  title: string;
  intro?: string;
  /** Home first, current page last. Rendered as the visible trail and as BreadcrumbList JSON-LD. */
  breadcrumbs: Crumb[];
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd data={jsonLdGraph(breadcrumbJsonLd(breadcrumbs))} />
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight md:text-4xl">{title}</h1>
      {intro ? <p className="mt-4 text-lg leading-8 text-zinc-600">{intro}</p> : null}
      <div className={`mt-8 ${PROSE}`}>{children}</div>
    </div>
  );
}
