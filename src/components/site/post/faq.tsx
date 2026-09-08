import type { FaqItem } from "@/lib/validation";
import { POST_IDS } from "./ids";

/** FAQ as native <details> accordions — no client JS. The same items feed the FAQPage JSON-LD. */
export function Faq({ items }: { items: FaqItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={POST_IDS.faq} className="mt-14">
      <h2 id={POST_IDS.faq} className="font-display text-2xl font-bold tracking-tight text-fg">
        Frequently asked questions
      </h2>
      <div className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {items.map((item, i) => (
          <details key={`${i}-${item.question}`} className="group bg-bg">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3.5 font-display text-[15px] font-semibold text-fg hover:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 break-words">{item.question}</span>
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5 shrink-0 text-fg-muted transition-transform group-open:rotate-180">
                <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <p className="break-words px-5 pb-5 leading-7 text-fg-body">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
