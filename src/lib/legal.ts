/**
 * Legal identity and page registry. Hard-coded on purpose (no admin setting, no placeholder):
 * these facts must not drift with runtime configuration.
 */

export const LEGAL = {
  entity: "Thea",
  governingLaw: "India",
  /** Shown as "Last updated" on every legal page. Bump when any legal page changes. */
  updated: "2026-09-09",
} as const;

export const LEGAL_PAGES = [
  { slug: "privacy-policy", title: "Privacy policy", description: "What Thea collects, why, and your rights under the GDPR, CCPA/CPRA and India's DPDP Act." },
  { slug: "terms", title: "Terms of use", description: "The terms that apply when you read or reuse anything on Thea." },
  { slug: "cookie-policy", title: "Cookie policy", description: "Which cookies and browser storage Thea uses, and how to control them." },
  { slug: "disclaimer", title: "Disclaimer", description: "Thea is independent of Microsoft; guides are informational and followed at your own risk." },
  { slug: "advertising-disclosure", title: "Advertising disclosure", description: "How Thea is funded and how ads are kept separate from editorial content." },
  { slug: "copyright", title: "Copyright and DMCA", description: "Who owns Thea's content, what you may reuse, and how to report infringement." },
] as const;

export type LegalSlug = (typeof LEGAL_PAGES)[number]["slug"];

export function legalPath(slug: LegalSlug): string {
  return `/${slug}`;
}

export function legalPage(slug: LegalSlug) {
  return LEGAL_PAGES.find((p) => p.slug === slug)!;
}

/** "9 September 2026" */
export function formatLegalDate(iso: string = LEGAL.updated): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}
