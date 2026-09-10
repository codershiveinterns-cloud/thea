import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/site/static-page";
import { SITE } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;

const PATH = "/editorial-policy";

export const metadata: Metadata = buildMetadata({
  title: "Editorial policy",
  description: `How ${SITE.name} articles are sourced, tested, corrected and kept independent of advertising.`,
  path: PATH,
});

export default function EditorialPolicyPage() {
  return (
    <StaticPage
      title="Editorial policy"
      intro={`How ${SITE.name} articles are sourced, checked and corrected — and what the badges on each article mean.`}
      breadcrumbs={[
        { name: "Home", path: "/" },
        { name: "Editorial policy", path: PATH },
      ]}
    >
      <h2>Sourcing</h2>
      <p>
        Articles are built only from official sources: Microsoft’s release notes and Windows release health pages, Microsoft support
        articles, and Windows Insider blog posts. Forum threads and social posts can point us at a problem, but a claim only makes it into an
        article if it is backed by one of those sources or by our own test.
      </p>
      <p>
        We never invent KB numbers, build numbers or error codes. Every identifier in an article comes from the source material, and the
        list of sources used for each article is kept on file.
      </p>

      <h2>Verification</h2>
      <p>
        Every article carries a line saying it was checked against Microsoft&apos;s release notes on its publication date and is re-checked
        when a new build ships. When an editor has also run the steps on a real PC, the same line names the build it was tested on.
      </p>
      <p>
        When Microsoft ships a new build, articles that cover affected updates, features or errors are re-checked. A method that no longer
        works is removed or marked as not working on that build, and the verified date is updated.
      </p>

      <h2>AI disclosure</h2>
      <p>
        First drafts are generated with an AI model, working only from the sources described above. Every draft passes an automated check
        for structure, thin content and identifiers that do not appear in the sources; anything that fails goes to a review queue and is
        not published until a human editor has fixed it.
      </p>
      <p>
        A human editor reviews each article against its sources and tests the steps on a real PC — usually before it is published.
        Articles that pass the automated check can be published automatically so that same-day coverage is available quickly; the hands-on
        check then follows, and once it has happened the article names the build it was tested on.
      </p>
      <p>The byline on an article names the editor responsible for it — the person who checks its sources and runs the steps.</p>

      <h2>Corrections</h2>
      <p>
        If a fix did not work for you or a fact is wrong, tell us through the <Link href="/contact">contact page</Link>. Include the
        article link, your Windows build and the exact error text so we can reproduce it.
      </p>
      <p>
        We check every report against the sources and on a test PC. When an article changes, the updated date shown on it changes too, so
        the correction is visible rather than silent.
      </p>

      <h2>Advertising and independence</h2>
      <p>
        {SITE.name} is funded by self-managed display advertising. Ads sit in fixed slots on article pages, are always labelled{" "}
        <strong>Advertisement</strong>, and have no say in what we cover or how a fix is written. There are no affiliate links, no sponsored
        fixes and no paid tool recommendations.
      </p>
      <p>
        {SITE.name} is not affiliated with, endorsed by or sponsored by Microsoft. Windows is a trademark of Microsoft Corporation, and we
        link to Microsoft’s documentation because it is the primary source.
      </p>

      <h2>Screenshots</h2>
      <p>
        Screenshots are real captures from the build named in the article’s <strong>Tested on</strong> line, taken by the editor who ran the
        steps. They may be cropped or annotated to point at the right control, but what they show is not altered. When a new build moves or
        changes the interface, screenshots are retaken as part of re-verification.
      </p>
      <p>
        An article whose hands-on check has not happened yet may show a branded cover image until its screenshots are added.
      </p>
      <h2>Disclaimer</h2>
      <p>
        {SITE.name} is not affiliated with Microsoft, guides are informational and followed at your own risk, and every article states the
        date it was checked against Microsoft&apos;s release notes. The full <Link href="/disclaimer">disclaimer</Link> explains each point.
      </p>
    </StaticPage>
  );
}
