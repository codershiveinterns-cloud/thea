import Link from "next/link";
import { SITE } from "@/lib/constants";

const POINTS = [
  { title: "Same-day coverage", body: "What changed and what broke, on the day Microsoft ships it." },
  { title: "Checked against Microsoft’s release notes", body: "Every guide states the date it was checked and is re-checked when a new build ships; hands-on verification, with the build it was tested on, is added when available." },
  { title: "No invented identifiers", body: "KB numbers, build numbers and error codes only ever come from Microsoft’s own pages, which every article links to." },
];

/** Slim trust strip at the foot of the home page, linking to the full policy. */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="mt-20 rounded-2xl border border-line bg-bg-2 px-5 py-8 sm:px-8">
      <h2 id="how-heading" className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-fg-muted">
        How {SITE.name} works
      </h2>
      <ul className="mt-5 grid gap-6 md:grid-cols-3">
        {POINTS.map((p, i) => (
          <li key={p.title} className="flex gap-4">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-accent-fg" aria-hidden="true">
              {i + 1}
            </span>
            <div>
              <h3 className="font-display text-base font-semibold text-fg">{p.title}</h3>
              <p className="mt-1 text-sm leading-6 text-fg-body">{p.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6">
        <Link href="/editorial-policy" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline">
          Read our editorial policy <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </p>
    </section>
  );
}
