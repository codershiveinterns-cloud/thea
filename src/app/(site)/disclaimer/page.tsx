import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, legalMetadata } from "@/components/site/legal-page";
import { LEGAL } from "@/lib/legal";

export const revalidate = 3600;
export const metadata: Metadata = legalMetadata("disclaimer");

export default function DisclaimerPage() {
  return (
    <LegalPage slug="disclaimer" intro="Read this before you follow any guide on the site.">
      <h2>Not affiliated with Microsoft</h2>
      <p>
        {LEGAL.entity} is an independent publication. It is not affiliated with, endorsed by, sponsored by or otherwise connected to Microsoft
        Corporation. Windows, Windows 11, Microsoft, Copilot and related names and logos are trademarks of Microsoft Corporation, used here only
        to identify the products the guides are about. Links to Microsoft pages are provided as sources; Microsoft is not responsible for our
        content.
      </p>

      <h2>Informational only, at your own risk</h2>
      <p>
        Our guides describe steps that worked on the builds we name. Your computer, drivers, apps and settings differ, and Windows changes with
        every update. You follow any guide at your own risk. We are not responsible for data loss, an unbootable PC, lost time or any other harm
        that results, and nothing here is professional IT advice.
      </p>

      <h2>Back up first</h2>
      <p>
        Before editing system files, the registry, boot settings or partitions, or before running commands that repair or reset Windows, back up
        your files and, where possible, create a restore point or full system image. Steps that touch these areas are marked in the guides; if you
        are not comfortable performing them, stop and seek help.
      </p>

      <h2>How the content is produced</h2>
      <p>
        Articles are AI-assisted: a first draft is generated from Microsoft&apos;s official documentation and release notes and then checked
        against those sources for accuracy, structure and invented identifiers. KB numbers, build numbers and error codes are only ever taken from
        Microsoft&apos;s own pages, which every article links to. An article shows a <strong>&ldquo;Verified: pending&rdquo;</strong> badge until a
        person has completed a hands-on check on a current build; once that happens the article shows the build it was tested on and the date. How
        this works in detail is on the <Link href="/editorial-policy">editorial policy</Link> page.
      </p>

      <h2>Errors and corrections</h2>
      <p>
        If a step is wrong or no longer works, tell us at <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> with the Windows build, the KB number
        and the exact error text. We correct articles and show the updated date on the page.
      </p>

      <h2>External links</h2>
      <p>We link to third-party sites as sources. We do not control them and are not responsible for their availability or content.</p>

      <p>
        See also the <Link href="/terms">terms of use</Link>, which limit our liability, and the <Link href="/privacy-policy">privacy policy</Link>.
      </p>
    </LegalPage>
  );
}
