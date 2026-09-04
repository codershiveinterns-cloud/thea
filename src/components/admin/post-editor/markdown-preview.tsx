"use client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PROSE_CLASS } from "./prose";

/** Live markdown preview. Raw HTML is never rendered (no rehype-raw), per CLAUDE.md. */
export function MarkdownPreview({ markdown, className = "" }: { markdown: string; className?: string }) {
  if (!markdown.trim()) {
    return <p className={`text-sm text-zinc-400 ${className}`}>Nothing to preview yet.</p>;
  }
  return (
    <div className={`${PROSE_CLASS} ${className}`}>
      <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
    </div>
  );
}
