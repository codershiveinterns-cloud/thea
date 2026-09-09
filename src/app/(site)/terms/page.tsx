import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, legalMetadata } from "@/components/site/legal-page";
import { LEGAL } from "@/lib/legal";

export const revalidate = 3600;
export const metadata: Metadata = legalMetadata("terms");

export default function TermsPage() {
  return (
    <LegalPage slug="terms" intro={`By reading ${LEGAL.entity} you agree to these terms. They are short because the site is simple: we publish guides, you read them.`}>
      <h2>Informational use only</h2>
      <p>
        Everything on {LEGAL.entity} is general information about Windows updates and troubleshooting. It is not professional IT support, is not
        tailored to your computer, and is not a substitute for Microsoft&apos;s own documentation or a technician who can see your machine. Read the{" "}
        <Link href="/disclaimer">disclaimer</Link> before following any guide.
      </p>

      <h2>No warranty</h2>
      <p>
        The site and its content are provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind, express or implied,
        including accuracy, completeness, fitness for a particular purpose and non-infringement. Windows changes with every update; a step that
        worked on the build we tested may not work on yours.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, {LEGAL.entity} and the people who write for it are not liable for any loss or damage of any kind,
        including lost data, downtime, hardware or software damage, or lost profits, arising from your use of the site or from following any guide,
        whether in contract, tort or otherwise. Where liability cannot be excluded, it is limited to the amount you paid to use the site, which is
        nothing.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The articles, quick answers, FAQs, images we create and the site&apos;s design are owned by {LEGAL.entity} and protected by copyright.
        Microsoft product names, screenshots of Microsoft software and quotations from Microsoft documentation belong to Microsoft and are used for
        identification and commentary. See the <Link href="/copyright">copyright page</Link> for what you may reuse.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>You may read, link to and quote short excerpts of our articles with attribution and a link.</li>
        <li>You may not scrape, crawl for republication, mirror, or bulk-download the site, or republish articles in full, without written permission requested through the <Link href="/contact">contact page</Link>.</li>
        <li>You may not use the content to train, fine-tune or evaluate machine-learning models without permission.</li>
        <li>You may not interfere with the site, probe it for vulnerabilities without authorisation, or use it to distribute malware or spam.</li>
      </ul>
      <p>Search engines and feed readers fetching pages for indexing and display are welcome; that is what the sitemap and RSS feed are for.</p>

      <h2>Third-party links</h2>
      <p>We link to Microsoft and other external sites as sources. We do not control them and are not responsible for their content or practices.</p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of {LEGAL.governingLaw}. Any dispute is subject to the exclusive jurisdiction of the courts of{" "}
        {LEGAL.governingLaw}. If you access the site from elsewhere you do so on your own initiative and are responsible for local laws.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may change these terms at any time by posting a new version here and updating the &ldquo;Last updated&rdquo; date. Continued use of the
        site after a change means you accept it. If any part of these terms is found unenforceable, the rest still applies.
      </p>

      <h2>Contact</h2>
      <p>Questions about these terms: use the <Link href="/contact">contact page</Link>.</p>
    </LegalPage>
  );
}
