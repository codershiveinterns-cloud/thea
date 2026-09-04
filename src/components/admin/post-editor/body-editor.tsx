"use client";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { regenerateSection } from "@/lib/admin/pipeline";
import { readingTimeMinutes, replaceH2Section, splitH2Sections, wordCount } from "@/lib/post-utils";
import { MarkdownPreview } from "./markdown-preview";

type Mode = "edit" | "preview" | "split";
const MODES: { key: Mode; label: string }[] = [
  { key: "edit", label: "Edit" },
  { key: "preview", label: "Preview" },
  { key: "split", label: "Split" },
];

// Same checks as validateForPublish() in src/lib/post-status.ts — keep these regexes in sync.
const METHOD_1_RE = /^##\s+Method\s+1\b/m;
const IF_NOTHING_WORKED_RE = /^##\s+If nothing worked/m;
const MIN_BODY_CHARS = 300;

function structureHints(body: string): string[] {
  const hints: string[] = [];
  if (!METHOD_1_RE.test(body)) hints.push('Missing an H2 that starts with "Method 1:" — put each fix under "## Method 1: …", "## Method 2: …".');
  if (!IF_NOTHING_WORKED_RE.test(body)) hints.push('Missing the "## If nothing worked" section.');
  if (body.trim().length < MIN_BODY_CHARS) hints.push(`Body is thin (under ~${MIN_BODY_CHARS} characters).`);
  return hints;
}

const TEMPLATE = [
  "One or two sentences on what the problem is, when it appears, and who it affects.",
  "",
  "## Method 1: Name the quickest fix",
  "",
  "1. First step — say where to click and what the screen should show.",
  "2. Second step.",
  "3. Restart and check whether the problem is gone.",
  "",
  "## Method 2: Name the next fix",
  "",
  "1. First step.",
  "2. Second step.",
  "",
  "## If nothing worked",
  "",
  "What to try as a last resort, and when to wait for a fix from Microsoft.",
  "",
].join("\n");

type Props = {
  value: string;
  onChange: (next: string) => void;
  /** null for unsaved posts — section regeneration needs a saved post id */
  postId: string | null;
  /** Full post preview rendered in Preview mode */
  preview: ReactNode;
  error?: string;
};

const TEXTAREA_CLASS =
  "block w-full min-h-[28rem] resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-[13px] leading-5 text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30";

export function BodyEditor({ value, onChange, postId, preview, error }: Props) {
  const [mode, setMode] = useState<Mode>("edit");
  const [regenPending, startRegen] = useTransition();
  const [regenIndex, setRegenIndex] = useState<number | null>(null);
  const [regenMsg, setRegenMsg] = useState<{ index: number; ok: boolean; message: string } | null>(null);

  // Latest body for the async regenerate callback (the user may keep typing meanwhile).
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  const { sections } = splitH2Sections(value);
  const words = wordCount(value);
  const hints = structureHints(value);

  function regenerate(index: number, heading: string) {
    if (!postId) return;
    setRegenIndex(index);
    setRegenMsg(null);
    startRegen(async () => {
      const result = await regenerateSection({ postId, sectionIndex: index, heading });
      if (result.ok && result.content) onChange(replaceH2Section(latest.current, index, result.content));
      setRegenMsg({ index, ok: result.ok, message: result.message });
      setRegenIndex(null);
    });
  }

  const textarea = (
    <textarea
      id="post-body"
      name="body"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={'Markdown. Use "## Method 1: …" per fix and end with "## If nothing worked".'}
      spellCheck
      className={`${TEXTAREA_CLASS} ${mode === "preview" ? "hidden" : ""}`}
      aria-invalid={error ? true : undefined}
    />
  );

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Body editor mode" className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={mode === m.key}
              onClick={() => setMode(m.key)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                mode === m.key ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>
            {words} words · {readingTimeMinutes(value)} min read
          </span>
          {!value.trim() ? (
            <Button size="sm" intent="ghost" onClick={() => onChange(TEMPLATE)}>
              Insert template
            </Button>
          ) : null}
        </div>
      </div>

      {mode === "split" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {textarea}
          <div className="max-h-[40rem] overflow-auto rounded-md border border-zinc-200 bg-white p-4">
            <MarkdownPreview markdown={value} />
          </div>
        </div>
      ) : (
        <>
          {textarea}
          {mode === "preview" ? <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white p-4 sm:p-6">{preview}</div> : null}
        </>
      )}
      {error ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-zinc-700">Sections ({sections.length} H2)</p>
          {sections.length ? (
            <ul className="mt-1 divide-y divide-zinc-100 rounded-md border border-zinc-200">
              {sections.map((s) => (
                <li key={`${s.index}-${s.heading}`} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">{s.heading}</p>
                    <p className="text-xs text-zinc-500">{wordCount(s.content)} words</p>
                    {regenMsg?.index === s.index ? (
                      <p className={`mt-1 text-xs ${regenMsg.ok ? "text-emerald-700" : "text-amber-700"}`}>{regenMsg.message}</p>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    intent="secondary"
                    disabled={!postId || regenPending}
                    title={!postId ? "Save the draft first" : `Regenerate "${s.heading}" with the AI pipeline`}
                    onClick={() => regenerate(s.index, s.heading)}
                  >
                    {regenPending && regenIndex === s.index ? "Regenerating…" : "Regenerate"}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">No H2 sections yet.</p>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-700">Structure</p>
          {hints.length ? (
            <ul className="mt-1 space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {hints.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              Structure looks good: numbered methods and an “If nothing worked” section are present.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
