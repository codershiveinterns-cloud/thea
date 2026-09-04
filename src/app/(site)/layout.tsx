import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";

/** Public site chrome. Admin lives outside this group and keeps its own layout. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
