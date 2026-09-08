import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import { SITE } from "@/lib/constants";
import { DEFAULT_ROBOTS } from "@/lib/seo";
import "./globals.css";

// One display face for headlines, one readable body face. Both self-hosted by next/font, swapped in without layout shift.
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["600", "700"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.tagline,
  applicationName: SITE.name,
  robots: DEFAULT_ROBOTS,
  alternates: { types: { "application/rss+xml": [{ url: "/feed.xml", title: `${SITE.name} RSS feed` }] } },
  openGraph: { siteName: SITE.name, locale: "en_US", type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
