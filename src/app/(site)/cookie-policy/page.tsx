import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, legalMetadata } from "@/components/site/legal-page";
import { LEGAL } from "@/lib/legal";
import { getTrackingConfig } from "@/lib/tracking";

export const revalidate = 3600;
export const metadata: Metadata = legalMetadata("cookie-policy");

export default async function CookiePolicyPage() {
  const { gaId, adsEnabled, anyEnabled } = await getTrackingConfig();
  return (
    <LegalPage slug="cookie-policy" intro={`${LEGAL.entity} sets no cookies by default. This page lists exactly what is stored in your browser and when.`}>
      <h2>Current status</h2>
      <p>
        {anyEnabled ? (
          <>
            Optional services are enabled on this site right now: {gaId ? "Google Analytics" : ""}
            {gaId && adsEnabled ? " and " : ""}
            {adsEnabled ? "display advertising" : ""}. They can set cookies, so a consent banner is shown on your first visit.
          </>
        ) : (
          <>
            No analytics and no ads are enabled, so <strong>no cookies are set</strong> and no consent banner is shown. The rest of this page
            describes what would apply if we switched them on.
          </>
        )}
      </p>

      <h2>Strictly necessary storage</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Purpose</th>
            <th>Lifetime</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>thea-consent</td>
            <td>Local storage</td>
            <td>Remembers whether you accepted or declined optional cookies, so the banner is not shown again. Only written when the banner is shown.</td>
            <td>Until you clear site data</td>
          </tr>
        </tbody>
      </table>
      <p>Local storage is not a cookie and is never sent to our servers.</p>

      <h2>Analytics cookies (only with consent)</h2>
      <p>
        {gaId ? "Google Analytics is enabled." : "Google Analytics is not enabled today."} When it is on and you accept, Google sets first-party
        cookies such as <code>_ga</code> and <code>_ga_*</code> (up to two years) to distinguish visitors and sessions. The analytics script does not
        load at all until you click Accept. Declining keeps the site fully usable.
      </p>

      <h2>Advertising cookies (only when ads are shown)</h2>
      <p>
        {adsEnabled ? "Display ads are enabled." : "No ads are shown today."} Ad code we place in marked slots may set its own cookies or read
        identifiers under the advertiser&apos;s policy. We do not use ad networks that build cross-site profiles. See the{" "}
        <Link href="/advertising-disclosure">advertising disclosure</Link>.
      </p>

      <h2>How to control cookies</h2>
      <ul>
        <li>Decline in the banner: optional scripts never load.</li>
        <li>Change your mind: clear this site&apos;s data in your browser settings and the banner returns on your next visit.</li>
        <li>Block cookies entirely in your browser: the site still works; nothing here depends on cookies.</li>
      </ul>

      <h2>Questions</h2>
      <p>
        Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. The <Link href="/privacy-policy">privacy policy</Link> explains the data behind each
        of these services.
      </p>
    </LegalPage>
  );
}
