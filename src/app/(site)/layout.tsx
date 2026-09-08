import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { THEME_INIT_SCRIPT } from "@/components/site/theme-toggle";

/** Public site chrome. Admin lives outside this group and keeps its own layout. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site flex min-h-screen flex-col bg-bg text-fg">
      {/* Applies the saved/system theme before first paint so dark mode never flashes light. */}
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
