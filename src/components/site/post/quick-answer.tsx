import { POST_IDS } from "./ids";

/** The 2–3 sentence answer callout under the H1 (CLAUDE.md post structure). */
export function QuickAnswer({ text }: { text: string }) {
  const answer = text.trim();
  if (!answer) return null;
  return (
    <section aria-labelledby={POST_IDS.quickAnswer} className="mt-8 rounded-2xl border border-line bg-accent-soft/60 p-5 sm:p-6">
      <h2 id={POST_IDS.quickAnswer} className="flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-[0.12em] text-accent">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 2.5 12.2 7.6 17.5 8.2 13.6 11.9 14.7 17.3 10 14.6 5.3 17.3 6.4 11.9 2.5 8.2 7.8 7.6z" />
        </svg>
        Quick answer
      </h2>
      <p className="mt-3 break-words text-[17px] leading-7 text-fg sm:text-lg sm:leading-8">{answer}</p>
    </section>
  );
}
