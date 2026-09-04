"use client";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dates";
import type { FaqItem } from "@/lib/validation";
import { MarkdownPreview } from "./markdown-preview";

type Props = {
  title: string;
  quickAnswer: string;
  affectedBuilds: string[];
  body: string;
  faq: FaqItem[];
  testedOnBuild: string;
  /** yyyy-mm-dd from the date input, or "" */
  lastVerifiedAt: string;
  authorName: string;
  categoryName: string;
  featuredImage: string;
};

/** Renders the full post structure the public page will use, from the live form values. */
export function PostPreview(p: Props) {
  // Parse the date-only value at local noon so the displayed day never shifts with the timezone.
  const verified = p.lastVerifiedAt ? formatDate(new Date(`${p.lastVerifiedAt}T12:00:00`)) : null;
  const testedOn = p.testedOnBuild.trim();

  return (
    <article className="mx-auto max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-wide text-blue-700">{p.categoryName || "Category"}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">{p.title.trim() || "Untitled post"}</h1>
      <p className="mt-2 text-sm text-zinc-500">
        By {p.authorName || "—"}
        {testedOn ? ` · Tested on: ${testedOn}` : " · Verified: pending"}
        {verified ? ` · Last verified: ${verified}` : ""}
      </p>

      {p.featuredImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.featuredImage} alt="" className="mt-4 w-full rounded-lg border border-zinc-200" />
      ) : null}

      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Quick answer</p>
        <p className="mt-1 text-sm leading-6 text-blue-950">{p.quickAnswer.trim() || "Add a 2–3 sentence quick answer."}</p>
      </div>

      {p.affectedBuilds.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-zinc-500">Affects:</span>
          {p.affectedBuilds.map((b) => (
            <Badge key={b}>{b}</Badge>
          ))}
        </div>
      ) : null}

      <MarkdownPreview markdown={p.body} className="mt-4" />

      {p.faq.length ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900">Frequently asked questions</h2>
          <dl className="mt-3 divide-y divide-zinc-200">
            {p.faq.map((f, i) => (
              <div key={i} className="py-3">
                <dt className="text-sm font-medium text-zinc-900">{f.question.trim() || "Question"}</dt>
                <dd className="mt-1 text-sm leading-6 text-zinc-700">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <p className="mt-8 border-t border-zinc-200 pt-3 text-xs text-zinc-500">
        Tested on: {testedOn || "pending"} · Last verified: {verified ?? "—"} · Author: {p.authorName || "—"}
      </p>
    </article>
  );
}
