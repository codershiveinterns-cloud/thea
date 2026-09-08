import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { CategorySection } from "@/components/site/home/category-section";
import { HomeHero } from "@/components/site/home/hero";
import { HowItWorks } from "@/components/site/home/how-it-works";
import { UpdatesStrip } from "@/components/site/home/updates-strip";
import { CATEGORIES, SITE } from "@/lib/constants";
import { latestByCategory, latestPosts } from "@/lib/posts";
import { buildMetadata, jsonLdGraph, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export const revalidate = 3600;

const TITLE = `${SITE.name} — ${SITE.tagline}`;

export const metadata: Metadata = {
  ...buildMetadata({
    title: TITLE,
    description: `${SITE.tagline}. What changed in each Windows 11 update, what it broke, and step-by-step fixes checked against Microsoft's release notes.`,
    path: "/",
  }),
  // The root layout applies a "%s · Thea" template; the home title already carries the site name.
  title: { absolute: TITLE },
};

export default async function HomePage() {
  const [latest, byCategory] = await Promise.all([latestPosts(9), latestByCategory(4)]);
  const hasPosts = latest.length > 0;

  return (
    <>
      <JsonLd data={jsonLdGraph(organizationJsonLd(), websiteJsonLd())} />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <HomeHero posts={latest} />
        {hasPosts ? (
          <>
            <UpdatesStrip posts={byCategory["windows-updates"]} />
            {CATEGORIES.map((category) => (
              <CategorySection key={category.slug} category={category} posts={byCategory[category.slug]} />
            ))}
          </>
        ) : null}
        <HowItWorks />
      </div>
    </>
  );
}
