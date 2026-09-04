import { POST_IDS } from "./ids";

/** The 2–3 sentence answer box under the H1 (CLAUDE.md post structure). */
export function QuickAnswer({ text }: { text: string }) {
  const answer = text.trim();
  if (!answer) return null;
  return (
    <section aria-labelledby={POST_IDS.quickAnswer} className="mt-6 rounded-xl border-l-4 border-blue-600 bg-blue-50 p-5">
      <h2 id={POST_IDS.quickAnswer} className="text-xs font-semibold uppercase tracking-wide text-blue-700">
        Quick answer
      </h2>
      {/* break-words: a registry path or catalog URL must wrap instead of forcing horizontal scroll on mobile. */}
      <p className="mt-2 break-words text-lg leading-7 text-zinc-800">{answer}</p>
    </section>
  );
}
