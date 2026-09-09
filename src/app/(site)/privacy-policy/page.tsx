import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, legalMetadata } from "@/components/site/legal-page";
import { LEGAL } from "@/lib/legal";
import { getTrackingConfig } from "@/lib/tracking";

export const revalidate = 3600;
export const metadata: Metadata = legalMetadata("privacy-policy");

export default async function PrivacyPolicyPage() {
  const { gaId, adsEnabled } = await getTrackingConfig();
  return (
    <LegalPage slug="privacy-policy" intro={`This policy explains what ${LEGAL.entity} collects when you read the site, why, who it is shared with, and the rights you have wherever you live.`}>
      <h2>Who we are</h2>
      <p>
        {LEGAL.entity} is a Windows how-to publication operated from {LEGAL.governingLaw} with readers worldwide. For anything in this policy, use the{" "}
        <Link href="/contact">contact page</Link>. We are the data controller (GDPR), the business (CCPA/CPRA) and the data fiduciary (DPDP
        Act) for the processing described here.
      </p>

      <h2>What we collect and why</h2>
      <p>
        <strong>Server logs.</strong> The site is hosted on Vercel. Like every web host, Vercel records standard request data when you load a page: your
        IP address, the page requested, the time, your browser&apos;s user-agent string and the referring page. We use these logs only to keep the
        site running, to diagnose errors and to block abuse. They are retained for a short period by Vercel and then deleted; we do not export or
        combine them with other data.
      </p>
      <p>
        <strong>Analytics.</strong>{" "}
        {gaId ? (
          <>
            We use Google Analytics 4 to understand which guides are read and how readers arrive. It sets first-party cookies and sends page views,
            approximate location and device information to Google. Analytics loads only after you accept it in the cookie banner; until then nothing
            is sent. Google&apos;s own privacy policy applies to that data. You can withdraw consent at any time by clearing the site&apos;s storage in
            your browser, which brings the banner back.
          </>
        ) : (
          <>
            Analytics is currently <strong>switched off</strong>. No analytics script loads and no analytics cookies are set. If we turn it on, this
            section, the <Link href="/cookie-policy">cookie policy</Link> and the cookie banner will say so, and it will load only after you accept.
          </>
        )}
      </p>
      <p>
        <strong>Advertising.</strong>{" "}
        {adsEnabled ? (
          <>
            We show self-managed display ads in marked slots on article pages. The ad code may set cookies or read identifiers in your browser
            according to the advertiser&apos;s own policy; we do not run affiliate links, buy buttons or ad networks that follow you across sites. See
            the <Link href="/advertising-disclosure">advertising disclosure</Link>.
          </>
        ) : (
          <>
            No ads are currently shown, so no advertising cookies or identifiers are set. If that changes, the{" "}
            <Link href="/advertising-disclosure">advertising disclosure</Link> and the cookie banner will reflect it.
          </>
        )}
      </p>
      <p>
        <strong>Contact.</strong> If you write to us through the <Link href="/contact">contact page</Link>, we keep your message and address for as long
        as needed to answer it and to keep a record of corrections we made because of it. We do not add you to any list.
      </p>
      <p>
        <strong>RSS.</strong> Our feed at <Link href="/feed.xml">/feed.xml</Link> is a plain file. Your feed reader fetches it directly; we only see the
        same server-log data as for any page.
      </p>
      <p>
        <strong>IndexNow and search engines.</strong> When we publish or update an article we notify search engines through IndexNow and our
        sitemap. That tells them which URL changed; it contains nothing about readers.
      </p>

      <h2>Cookies and browser storage</h2>
      <p>
        We set <strong>no cookies</strong> unless analytics or ads are enabled. The only thing we store in your browser by default is your answer to
        the cookie banner (in local storage), and the banner itself appears only when analytics or ads are on. Details are in the{" "}
        <Link href="/cookie-policy">cookie policy</Link>.
      </p>

      <h2>Legal bases and purposes</h2>
      <ul>
        <li>Running and securing the site (server logs): our legitimate interest in operating a working, safe website.</li>
        <li>Analytics and advertising, where enabled: your consent, given through the cookie banner and withdrawable at any time.</li>
        <li>Answering your messages: our legitimate interest in responding, and, where you ask us to correct an article, in keeping the site accurate.</li>
      </ul>

      <h2>Who receives data</h2>
      <p>
        Vercel (hosting and logs), Google (only if analytics is enabled), and any advertiser whose code is shown in an ad slot (only if ads are
        enabled). We do not sell personal information and we do not share it for cross-context behavioural advertising. We may disclose data if
        the law requires it.
      </p>

      <h2>International transfers</h2>
      <p>
        We operate from {LEGAL.governingLaw}; Vercel and Google process data in the United States and other countries. Where transfer rules apply,
        those providers rely on standard contractual clauses or equivalent safeguards published in their own terms.
      </p>

      <h2>Retention</h2>
      <p>
        Server logs: the short period Vercel keeps them. Contact emails: while we handle your request, then as long as a record of a correction is
        useful. Consent choice: until you clear your browser storage. Analytics data, when enabled: per Google Analytics&apos; retention setting,
        which we keep at the shortest available option.
      </p>

      <h2>Your rights</h2>
      <p>
        <strong>European Economic Area and United Kingdom (GDPR/UK GDPR).</strong> You can ask for access to, correction of, deletion of, or a copy
        of your personal data, object to processing based on legitimate interest, restrict processing, and withdraw consent at any time. You may
        complain to your local supervisory authority.
      </p>
      <p>
        <strong>California (CCPA/CPRA).</strong> You have the right to know what personal information we collect and how it is used, to delete it,
        to correct it, to opt out of sale or sharing (we do neither), and not to be discriminated against for exercising these rights. We do not
        collect sensitive personal information and do not process data of readers we know to be under 16.
      </p>
      <p>
        <strong>India (Digital Personal Data Protection Act, 2023).</strong> As a data principal you can ask what personal data we hold, have it
        corrected or erased, withdraw consent, nominate someone to exercise these rights on your behalf, and raise a grievance with us. If we do not
        resolve it, you may approach the Data Protection Board of India.
      </p>
      <p>
        <strong>Everyone else.</strong> We honour the same requests regardless of where you are. Send a &ldquo;Privacy request&rdquo; through the <Link href="/contact">contact page</Link>; we reply within 30 days and may ask you to confirm the address the request concerns.
      </p>

      <h2>Children</h2>
      <p>The site is written for adults managing their own PCs. We do not knowingly collect personal data from children under 16 (under 18 in India). If you believe a child has sent us data, tell us via the <Link href="/contact">contact page</Link> and we will delete it.</p>

      <h2>Security</h2>
      <p>The site is served over HTTPS only. Access to our systems is limited to the people who run the publication and protected by credentials that are never stored in the code.</p>

      <h2>Changes</h2>
      <p>When this policy changes, the &ldquo;Last updated&rdquo; date at the top changes with it. Material changes are noted on the <Link href="/editorial-policy">editorial policy</Link> page.</p>
    </LegalPage>
  );
}
