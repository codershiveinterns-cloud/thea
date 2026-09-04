import Link from "next/link";
import { SITE } from "@/lib/constants";

type Step = { title: string; body: string; icon: React.ReactNode };

const ICON_PROPS = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const STEPS: Step[] = [
  {
    title: "Same-day coverage",
    body: "When Microsoft ships a cumulative or feature update, we cover what changed and what it broke on the day it lands — not a week later.",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    title: "Tested on real builds",
    body: "Fixes are reproduced on a test PC running the current Windows 11 build. Every post shows the build it was tested on — or “verification pending” until an editor has checked it.",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4M9 10l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Human-reviewed",
    body: "Drafts are AI-assisted, checked against Microsoft’s own release notes, and reviewed by a human editor. We never invent KB numbers, build numbers, or error codes.",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="10" cy="8" r="3.5" />
        <path d="M4 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 12l2 2 4-4" />
      </svg>
    ),
  },
];

/** Short trust band explaining the editorial process, linking to the full policy. */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="mt-12 rounded-xl border border-blue-100 bg-blue-50 px-4 py-8 md:px-8">
      <h2 id="how-heading" className="text-2xl font-semibold tracking-tight">
        How {SITE.name} works
      </h2>
      <ul className="mt-6 grid gap-6 md:grid-cols-3">
        {STEPS.map((step) => (
          <li key={step.title} className="flex gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              {step.icon}
            </span>
            <div>
              <h3 className="text-base font-semibold text-zinc-900">{step.title}</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-700">{step.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6">
        <Link href="/editorial-policy" className="inline-flex min-h-11 items-center text-sm font-medium text-blue-700 hover:underline">
          Read our editorial policy <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </p>
    </section>
  );
}
