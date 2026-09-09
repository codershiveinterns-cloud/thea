import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, legalMetadata } from "@/components/site/legal-page";
import { LEGAL } from "@/lib/legal";
import { getTrackingConfig } from "@/lib/tracking";

export const revalidate = 3600;
export const metadata: Metadata = legalMetadata("advertising-disclosure");

export default async function AdvertisingDisclosurePage() {
  const { adsEnabled } = await getTrackingConfig();
  return (
    <LegalPage slug="advertising-disclosure" intro={`How ${LEGAL.entity} pays for itself, and how that never touches what the guides say.`}>
      <h2>Current status</h2>
      <p>
        {adsEnabled ? (
          <>Display ads are currently shown on article pages in slots labelled &ldquo;Advertisement&rdquo;.</>
        ) : (
          <>
            <strong>No ads are shown on the site today.</strong> The site is funded out of pocket. If that changes, this page, the cookie banner and the
            ad slots themselves will make it obvious.
          </>
        )}
      </p>

      <h2>What we do</h2>
      <ul>
        <li>Self-managed display ads only, placed in clearly labelled slots: after the quick answer, before the last method or section, and before the FAQ.</li>
        <li>Ad slots never appear inside the steps, and ad copy is never written into an article.</li>
      </ul>

      <h2>What we do not do</h2>
      <ul>
        <li>No affiliate links and no &ldquo;buy&rdquo; buttons. If a guide mentions a product, it is because the fix needs it, and there is no commission.</li>
        <li>No sponsored articles, no paid placements in guides, and no advertiser influence on which topics we cover or what a guide recommends.</li>
        <li>No ad networks that track readers across other sites. Any cookies an ad sets are described in the <Link href="/cookie-policy">cookie policy</Link> and only after consent where consent is required.</li>
      </ul>

      <h2>Editorial independence</h2>
      <p>
        Advertisers have no access to articles before publication and no say over corrections. Every article links to the Microsoft sources it was
        generated from so you can check the facts yourself. See the <Link href="/editorial-policy">editorial policy</Link>.
      </p>

      <h2>Advertise or ask a question</h2>
      <p>Write to <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</p>
    </LegalPage>
  );
}
