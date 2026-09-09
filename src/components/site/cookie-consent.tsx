"use client";
import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";

export const CONSENT_KEY = "thea-consent";
type Consent = "accepted" | "declined";

function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Lightweight consent banner. Rendered by the site layout only when analytics or ads are enabled.
 * The Google Analytics script is loaded here, and only after "Accept" (or a stored acceptance), so
 * nothing is sent before consent. Declining stores the choice and loads nothing.
 */
export function CookieConsent({ gaId, adsEnabled }: { gaId: string | null; adsEnabled: boolean }) {
  const [consent, setConsent] = useState<Consent | null | "unknown">("unknown");
  useEffect(() => setConsent(readConsent()), []);

  function choose(next: Consent) {
    try {
      localStorage.setItem(CONSENT_KEY, next);
    } catch {
      /* private mode: banner will show again next visit */
    }
    setConsent(next);
  }

  const services = [gaId ? "analytics (Google Analytics)" : null, adsEnabled ? "display ads" : null].filter(Boolean).join(" and ");

  return (
    <>
      {consent === "accepted" && gaId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}</Script>
        </>
      ) : null}
      {consent === null ? (
        <div role="dialog" aria-live="polite" aria-label="Cookie consent" className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-bg p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-w-md sm:rounded-2xl sm:border">
          <p className="text-sm leading-6 text-fg-body">
            This site uses {services}, which can set cookies. Nothing loads until you accept. See the <Link href="/cookie-policy" className="font-medium text-accent underline">cookie policy</Link>.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => choose("accepted")} className="inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-fg">
              Accept
            </button>
            <button type="button" onClick={() => choose("declined")} className="inline-flex h-10 items-center rounded-full border border-line px-4 text-sm font-semibold text-fg hover:bg-bg-2">
              Decline
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
