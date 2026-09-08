import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { THEME_INIT_SCRIPT } from "@/components/site/theme-toggle";
import { SETTING_KEYS } from "@/lib/constants";
import { getSetting } from "@/lib/settings";
import Script from "next/script";

/** Public site chrome. Admin lives outside this group and keeps its own layout. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Go-live wiring (CLAUDE.md phase 5): renders only once the Setting is filled in.
  const gaId = (await getSetting(SETTING_KEYS.GA_MEASUREMENT_ID)).trim();
  return (
    <div className="site flex min-h-screen flex-col bg-bg text-fg">
      {/* Applies the saved/system theme before first paint so dark mode never flashes light. */}
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      {/^G-[A-Z0-9]+$/.test(gaId) ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}</Script>
        </>
      ) : null}
    </div>
  );
}
