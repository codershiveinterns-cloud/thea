import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/site/static-page";
import { SITE } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

const PATH = "/contact";
// Editorial inbox on the site's own domain. On localhost this is contact@localhost — expected until go-live.
const EMAIL = `contact@${new URL(SITE.url).hostname}`;

export const metadata: Metadata = buildMetadata({
  title: "Contact",
  description: `How to reach the ${SITE.name} editors to report a fix that did not work, correct a fact, or ask about advertising.`,
  path: PATH,
});

export default function ContactPage() {
  return (
    <StaticPage
      title="Contact"
      intro="One inbox for corrections, questions about how we work, and advertising."
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: "Contact", path: PATH },
      ]}
    >
      <h2>Editorial inbox</h2>
      <div className="my-6 rounded-xl border border-line bg-bg-2 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Email the editors</p>
        <a href={`mailto:${EMAIL}`} className="mt-1 inline-block break-all text-lg font-semibold text-accent hover:underline">
          {EMAIL}
        </a>
      </div>
      <p>
        That address goes straight to the people who write and test the articles. We read everything, but we cannot promise a reply to
        every message.
      </p>

      <h2>Reporting a fix that did not work</h2>
      <p>The more of this you include, the faster we can reproduce the problem and correct the article:</p>
      <ul>
        <li>A link to the article, and which method you were on.</li>
        <li>
          Your Windows version and build. Open <strong>Settings › System › About</strong>, or press <strong>Win + R</strong>, type{" "}
          <strong>winver</strong> and press Enter.
        </li>
        <li>If it concerns an update, the KB number shown in Windows Update or Update history.</li>
        <li>The exact error text or code, copied rather than retyped — a single character matters.</li>
        <li>What you tried and what happened, including any message that appeared.</li>
      </ul>
      <p>
        Corrections are handled as described in the <Link href="/editorial-policy">editorial policy</Link>: we re-test, fix the article, and
        the updated date on it changes so the correction is visible.
      </p>

      <h2>What we cannot help with</h2>
      <p>
        {SITE.name} is not a support desk. We cannot troubleshoot individual PCs, answer one-to-one support requests or walk you through a
        problem over email — the articles are the help we can offer. For hands-on support, Microsoft Support and your PC maker’s support
        line are the right places to go.
      </p>

      <h2>Advertising</h2>
      <p>
        Ad slots on {SITE.name} are self-managed and clearly labelled. Enquiries go to the same inbox with “Advertising” in the subject line.
        Advertising never influences what we cover or how a fix is written.
      </p>
    </StaticPage>
  );
}
