import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { SETTING_KEYS, SITE } from "@/lib/constants";
import { DEFAULT_ROBOTS } from "@/lib/seo";
import { getSetting } from "@/lib/settings";
import "./globals.css";

// One display face for headlines, one readable body face. Both self-hosted by next/font, swapped in without layout shift.
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["600", "700"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

/** Light only: renders <meta name="color-scheme" content="light"> so browsers never auto-darken form controls. */
export const viewport: Viewport = { colorScheme: "light", width: "device-width", initialScale: 1 };

const baseMetadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.tagline,
  applicationName: SITE.name,
  robots: DEFAULT_ROBOTS,
  alternates: { types: { "application/rss+xml": [{ url: "/feed.xml", title: `${SITE.name} RSS feed` }] } },
  openGraph: { siteName: SITE.name, locale: "en_US", type: "website" },
  twitter: { card: "summary_large_image" },
};

/** Search Console verification tag comes from Settings (empty until go-live). */
export async function generateMetadata(): Promise<Metadata> {
  const gsc = (await getSetting(SETTING_KEYS.GSC_VERIFICATION)).trim();
  return gsc ? { ...baseMetadata, verification: { google: gsc } } : baseMetadata;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
