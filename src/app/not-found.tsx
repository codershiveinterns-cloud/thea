import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { NOINDEX_ROBOTS } from "@/lib/seo";
import SiteNotFound from "./(site)/not-found";

export const metadata: Metadata = { title: "Page not found", robots: NOINDEX_ROBOTS };

/** Root 404 for URLs that match no route (three-plus segments, /admin typos, …). Same content as the site 404, with the site chrome. */
export default function RootNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900">
      <SiteHeader />
      <main id="main" className="flex-1">
        <SiteNotFound />
      </main>
      <SiteFooter />
    </div>
  );
}
