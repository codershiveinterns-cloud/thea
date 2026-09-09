import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, legalMetadata } from "@/components/site/legal-page";
import { LEGAL } from "@/lib/legal";

export const revalidate = 3600;
export const metadata: Metadata = legalMetadata("copyright");

export default function CopyrightPage() {
  return (
    <LegalPage slug="copyright" intro={`Who owns what on ${LEGAL.entity}, what you may reuse, and how to report a copyright problem.`}>
      <h2>Ownership</h2>
      <p>
        Unless stated otherwise, the text, quick answers, FAQs, images we create and the design of this site are © {LEGAL.entity}. All rights
        reserved. Microsoft product names, screenshots of Microsoft software and passages quoted from Microsoft documentation remain the property
        of Microsoft Corporation and are used for identification, commentary and instruction, with a link to the source on every article.
      </p>

      <h2>What you may do without asking</h2>
      <ul>
        <li>Link to any page.</li>
        <li>Quote a short excerpt (a sentence or two, or one step) with attribution to {LEGAL.entity} and a link to the article.</li>
        <li>Share an article&apos;s URL and its preview card on social media, in forums or in support tickets.</li>
        <li>Read the site through a feed reader using <Link href="/feed.xml">/feed.xml</Link>.</li>
      </ul>

      <h2>What needs permission</h2>
      <p>
        Republishing an article in full or in substantial part, translating it, mirroring the site, scraping it for redistribution, or using the
        content to train machine-learning models. Ask through the <Link href="/contact">contact page</Link>; we usually say yes to non-commercial
        reuse with credit.
      </p>

      <h2>Reporting copyright infringement (DMCA and equivalent notices)</h2>
      <p>
        If you believe something on {LEGAL.entity} infringes your copyright, send a notice through the <Link href="/contact">contact page</Link> with
        &ldquo;Copyright notice&rdquo; as the subject and include:
      </p>
      <ol>
        <li>The work you own and where it can be seen.</li>
        <li>The exact URL on {LEGAL.entity} where you believe it is used, and which part.</li>
        <li>Your name, organisation if any, and a way for us to reply to you.</li>
        <li>A statement that you believe in good faith the use is not authorised by the copyright owner, its agent or the law.</li>
        <li>A statement, under penalty of perjury where that applies, that the information is accurate and that you are the owner or authorised to act for the owner.</li>
        <li>Your physical or electronic signature.</li>
      </ol>
      <p>
        We acknowledge notices within five working days, remove or disable access to the material while we investigate, and tell the author. If
        the author sends a counter-notice we forward it to you and may restore the material after ten working days unless you tell us you have
        started court proceedings. Knowingly false notices can make you liable for damages.
      </p>

      <h2>Trademarks</h2>
      <p>
        Windows, Windows 11 and Microsoft are trademarks of Microsoft Corporation. {LEGAL.entity} is not affiliated with Microsoft; see the{" "}
        <Link href="/disclaimer">disclaimer</Link>.
      </p>

      <h2>Governing law</h2>
      <p>
        This page and any copyright dispute with {LEGAL.entity} are governed by the laws of {LEGAL.governingLaw}, as set out in the{" "}
        <Link href="/terms">terms of use</Link>.
      </p>
    </LegalPage>
  );
}
