import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StaticPage } from "@/components/site/static-page";
import { LEGAL, LEGAL_PAGES, formatLegalDate, legalPage, legalPath, type LegalSlug } from "@/lib/legal";
import { buildMetadata } from "@/lib/seo";
import Link from "next/link";

/** Metadata for a legal page: indexable, canonical, same OG treatment as every other page. */
export function legalMetadata(slug: LegalSlug): Metadata {
  const page = legalPage(slug);
  return buildMetadata({ title: page.title, description: page.description, path: legalPath(slug) });
}

/** Shared shell for the legal pages: the /about layout plus a "Last updated" line and cross-links. */
export function LegalPage({ slug, intro, children }: { slug: LegalSlug; intro?: string; children: ReactNode }) {
  const page = legalPage(slug);
  return (
    <StaticPage
      title={page.title}
      intro={intro}
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: page.title, path: legalPath(slug) },
      ]}
    >
      <p className="!mt-0 text-sm text-fg-muted">
        Last updated <time dateTime={LEGAL.updated}>{formatLegalDate()}</time> · Operated by {LEGAL.entity} · Questions: use the{" "}
        <Link href="/contact">contact page</Link>
      </p>
      {children}
      <h2>Related policies</h2>
      <ul>
        {LEGAL_PAGES.filter((p) => p.slug !== slug).map((p) => (
          <li key={p.slug}>
            <Link href={legalPath(p.slug)}>{p.title}</Link>
          </li>
        ))}
      </ul>
    </StaticPage>
  );
}
