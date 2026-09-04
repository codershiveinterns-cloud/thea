import type { FaqItem } from "@/lib/validation";
import { POST_IDS } from "./ids";

/**
 * FAQ as native <details> accordions — no client JS. The same items are emitted
 * as FAQPage JSON-LD by the page, so the visible text and the schema always match.
 */
export function Faq({ items }: { items: FaqItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={POST_IDS.faq} className="mt-12">
      <h2 id={POST_IDS.faq} className="text-2xl font-semibold tracking-tight text-zinc-900">
        Frequently asked questions
      </h2>
      <div className="mt-4 divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200">
        {items.map((item, i) => (
          <details key={`${i}-${item.question}`} className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 [&::-webkit-details-marker]:hidden">
              {/* min-w-0 lets the flex item shrink so break-words can wrap a long unbroken token. */}
              <span className="min-w-0 break-words">{item.question}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className="h-5 w-5 shrink-0 text-zinc-500 transition-transform group-open:rotate-180"
              >
                <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <p className="break-words px-4 pb-4 leading-7 text-zinc-700">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
