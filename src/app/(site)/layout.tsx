import { CookieConsent } from "@/components/site/cookie-consent";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { getTrackingConfig } from "@/lib/tracking";

/** Public site chrome. Admin lives outside this group and keeps its own layout. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Analytics and ads are optional; the banner (and the GA script, after consent) only exist when one of them is on.
  const tracking = await getTrackingConfig();
  return (
    <div className="site flex min-h-screen flex-col bg-bg text-fg">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      {tracking.anyEnabled ? <CookieConsent gaId={tracking.gaId} adsEnabled={tracking.adsEnabled} /> : null}
    </div>
  );
}
