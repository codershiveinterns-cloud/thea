"use client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { safeUrl } from "@/lib/sanitize";
import { PROSE_CLASS } from "./prose";

/** Live markdown preview. Raw HTML is never rendered (skipHtml) and unsafe URL schemes are dropped, matching the public renderer. */
export function MarkdownPreview({ markdown, className = "" }: { markdown: string; className?: string }) {
  if (!markdown.trim()) {
    return <p className={`text-sm text-zinc-400 ${className}`}>Nothing to preview yet.</p>;
  }
  return (
    <div className={`${PROSE_CLASS} ${className}`}>
      <Markdown remarkPlugins={[remarkGfm]} skipHtml urlTransform={safeUrl}>
        {markdown}
      </Markdown>
    </div>
  );
}
