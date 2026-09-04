import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { slugify } from "@/lib/slug";
import { splitH2Sections } from "@/lib/post-utils";
import { AdSlot } from "./ad-slot";

/**
 * Sanitised markdown → React. react-markdown never renders raw HTML (skipHtml),
 * so AI-generated bodies can't inject markup (CLAUDE.md hard rule).
 */

function headingId(text: ReactNode, used: Map<string, number>) {
  const base = slugify(String(flatten(text))) || "section";
  const n = used.get(base) ?? 0;
  used.set(base, n + 1);
  return n === 0 ? base : `${base}-${n + 1}`;
}

function flatten(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flatten).join("");
  if (typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return flatten(props?.children);
  }
  return "";
}

function makeComponents(used: Map<string, number>): Components {
  return {
    h1: ({ children }) => <h2 className="mt-10 scroll-mt-24 text-2xl font-semibold tracking-tight">{children}</h2>,
    h2: ({ children }) => {
      const id = headingId(children, used);
      return (
        <h2 id={id} className="group mt-10 scroll-mt-24 text-2xl font-semibold tracking-tight">
          <a href={`#${id}`} className="no-underline hover:underline">
            {children}
          </a>
        </h2>
      );
    },
    h3: ({ children }) => <h3 className="mt-6 text-lg font-semibold">{children}</h3>,
    p: ({ children }) => <p className="my-4 leading-7">{children}</p>,
    ol: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-6">{children}</ol>,
    ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-6">{children}</ul>,
    li: ({ children }) => <li className="leading-7">{children}</li>,
    a: ({ href, children }) => {
      const external = !!href && /^https?:\/\//.test(href);
      return (
        <a href={href} className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:decoration-blue-700" {...(external ? { rel: "noopener nofollow", target: "_blank" } : {})}>
          {children}
        </a>
      );
    },
    code: ({ children, className }) => {
      const block = !!className;
      return block ? (
        <code className={className}>{children}</code>
      ) : (
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-800">{children}</code>
      );
    },
    pre: ({ children }) => <pre className="my-4 overflow-x-auto rounded-lg bg-zinc-900 p-4 font-mono text-sm leading-6 text-zinc-100">{children}</pre>,
    blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-zinc-200 pl-4 text-zinc-600">{children}</blockquote>,
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    th: ({ children }) => <th className="border-b border-zinc-300 px-3 py-2 text-left font-semibold">{children}</th>,
    td: ({ children }) => <td className="border-b border-zinc-200 px-3 py-2 align-top">{children}</td>,
    img: ({ src, alt }) => (
      // Body images come from markdown with unknown dimensions; boxed to avoid layout shift.
      <span className="my-6 block overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" decoding="async" className="mx-auto max-h-[480px] w-auto" />
      </span>
    ),
    hr: () => <hr className="my-8 border-zinc-200" />,
    strong: ({ children }) => <strong className="font-semibold text-zinc-900">{children}</strong>,
  };
}

export function Markdown({ content, className = "" }: { content: string; className?: string }) {
  const used = new Map<string, number>();
  return (
    <div className={`text-[17px] text-zinc-800 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={makeComponents(used)}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Post body renderer that inserts the mid-article ad before the last "Method N:" section
 * (only when there are at least two methods) and keeps heading ids stable across sections.
 */
export function PostBody({ body }: { body: string }) {
  const { intro, sections } = splitH2Sections(body);
  const methodIdx = sections.map((s, i) => (/^Method\s+\d+/i.test(s.heading) ? i : -1)).filter((i) => i >= 0);
  const adBefore = methodIdx.length >= 2 ? methodIdx[methodIdx.length - 1] : -1;
  const used = new Map<string, number>();
  const components = makeComponents(used);
  return (
    <div className="text-[17px] text-zinc-800">
      {intro ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components}>
          {intro}
        </ReactMarkdown>
      ) : null}
      {sections.map((s) => (
        <section key={s.index} aria-labelledby={undefined}>
          {s.index === adBefore ? <AdSlot placement="mid-article" /> : null}
          <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components}>
            {`## ${s.heading}\n\n${s.content}`}
          </ReactMarkdown>
        </section>
      ))}
    </div>
  );
}

/** Ids for the on-page table of contents, computed the same way as the renderer. */
export function bodyHeadings(body: string): { id: string; text: string }[] {
  const used = new Map<string, number>();
  return splitH2Sections(body).sections.map((s) => {
    const text = plainHeadingText(s.heading);
    return { id: headingId(text, used), text };
  });
}

/** Strip inline markdown so ToC ids match what the renderer sees after react-markdown flattens children. */
function plainHeadingText(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(\*|_)(.+?)\1/g, "$2")
    .replace(/~~(.+?)~~/g, "$1")
    .trim();
}
