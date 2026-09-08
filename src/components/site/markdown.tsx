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

const METHOD_RE = /^Method\s+(\d+)\s*[:.\-–—]\s*(.*)$/i;

/** "Method 3: Free space" → numbered badge + title; other H2s render plainly. */
function H2({ children, id }: { children: ReactNode; id: string }) {
  const text = flatten(children);
  const m = METHOD_RE.exec(text.trim());
  if (m) {
    return (
      <h2 id={id} className="mt-12 flex scroll-mt-24 items-start gap-3 font-display text-2xl font-bold leading-tight tracking-tight text-fg">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-accent-fg" aria-hidden="true">
          {m[1]}
        </span>
        <a href={`#${id}`} className="hover:text-accent">
          <span className="sr-only">Method {m[1]}: </span>
          {m[2] || text}
        </a>
      </h2>
    );
  }
  return (
    <h2 id={id} className="mt-12 scroll-mt-24 font-display text-2xl font-bold leading-tight tracking-tight text-fg">
      <a href={`#${id}`} className="hover:text-accent">
        {children}
      </a>
    </h2>
  );
}

function makeComponents(used: Map<string, number>): Components {
  return {
    h1: ({ children }) => <h2 className="mt-12 scroll-mt-24 font-display text-2xl font-bold tracking-tight text-fg">{children}</h2>,
    h2: ({ children }) => <H2 id={headingId(children, used)}>{children}</H2>,
    h3: ({ children }) => <h3 className="mt-8 font-display text-lg font-semibold text-fg">{children}</h3>,
    p: ({ children }) => <p className="my-5 leading-[1.75] text-fg-body">{children}</p>,
    ol: ({ children }) => <ol className="my-5 list-decimal space-y-2.5 pl-6 marker:font-semibold marker:text-accent">{children}</ol>,
    ul: ({ children }) => <ul className="my-5 list-disc space-y-2 pl-6 marker:text-fg-muted">{children}</ul>,
    li: ({ children }) => <li className="pl-1 leading-[1.75] text-fg-body">{children}</li>,
    a: ({ href, children }) => {
      const external = !!href && /^https?:\/\//.test(href);
      return (
        <a href={href} className="font-medium text-accent underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent" {...(external ? { rel: "noopener nofollow", target: "_blank" } : {})}>
          {children}
        </a>
      );
    },
    code: ({ children, className }) => {
      const block = !!className;
      return block ? (
        <code className={className}>{children}</code>
      ) : (
        <code className="rounded-md border border-line bg-code-bg px-1.5 py-0.5 font-mono text-[0.88em] font-medium text-fg">{children}</code>
      );
    },
    pre: ({ children }) => <pre className="my-6 overflow-x-auto rounded-xl border border-line bg-code-bg p-4 font-mono text-[13.5px] leading-6 text-fg">{children}</pre>,
    blockquote: ({ children }) => <blockquote className="my-6 border-l-4 border-accent/50 pl-4 text-fg-muted">{children}</blockquote>,
    table: ({ children }) => (
      <div className="my-6 overflow-x-auto rounded-xl border border-line">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    th: ({ children }) => <th className="border-b border-line bg-bg-2 px-3 py-2 text-left font-semibold text-fg">{children}</th>,
    td: ({ children }) => <td className="border-b border-line px-3 py-2 align-top text-fg-body">{children}</td>,
    img: ({ src, alt }) => (
      <span className="my-6 block overflow-hidden rounded-xl border border-line bg-bg-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" decoding="async" className="mx-auto max-h-[480px] w-auto" />
      </span>
    ),
    hr: () => <hr className="my-10 border-line" />,
    strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
  };
}

const PROSE = "text-[17px] leading-7";

export function Markdown({ content, className = "" }: { content: string; className?: string }) {
  const used = new Map<string, number>();
  return (
    <div className={`${PROSE} ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={makeComponents(used)}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Post body renderer: each H2 section becomes its own <section> with clear separation;
 * the mid-article ad goes before the last "Method N" section (only with ≥ 2 methods).
 */
export function PostBody({ body }: { body: string }) {
  const { intro, sections } = splitH2Sections(body);
  const methodIdx = sections.map((s, i) => (/^Method\s+\d+/i.test(s.heading) ? i : -1)).filter((i) => i >= 0);
  const adBefore = methodIdx.length >= 2 ? methodIdx[methodIdx.length - 1] : -1;
  const used = new Map<string, number>();
  const components = makeComponents(used);
  return (
    <div className={PROSE}>
      {intro ? (
        <div className="text-lg leading-8 [&>p:first-child]:mt-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components}>
            {intro}
          </ReactMarkdown>
        </div>
      ) : null}
      {sections.map((s) => (
        <section key={s.index} className={s.index > 0 ? "border-t border-line" : ""}>
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
