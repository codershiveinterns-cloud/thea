"use client";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { regenerateSection } from "@/lib/admin/pipeline";
import { STRUCTURE_SPECS, structureFor, validateBodyStructure, type StructureKind } from "@/lib/post-structure";
import { readingTimeMinutes, replaceH2Section, splitH2Sections, wordCount } from "@/lib/post-utils";
import { MarkdownPreview } from "./markdown-preview";

type Mode = "edit" | "preview" | "split";
const MODES: { key: Mode; label: string }[] = [
  { key: "edit", label: "Edit" },
  { key: "preview", label: "Preview" },
  { key: "split", label: "Split" },
];

// Same checks as validateForPublish() in src/lib/post-status.ts (shared src/lib/post-structure.ts).
const MIN_BODY_CHARS = 300;

function structureHints(body: string, kind: StructureKind): string[] {
  const hints = validateBodyStructure(body, kind);
  if (body.trim().length < MIN_BODY_CHARS) hints.push(`Body is thin (under ~${MIN_BODY_CHARS} characters).`);
  return hints;
}

type Props = {
  value: string;
  onChange: (next: string) => void;
  /** Category slug of the post — picks the structure (release / fix / how-to) for hints and the template. */
  categorySlug: string;
  /** null for unsaved posts — section regeneration needs a saved post id */
  postId: string | null;
  /** Full post preview rendered in Preview mode */
  preview: ReactNode;
  error?: string;
};

const TEXTAREA_CLASS =
  "block w-full min-h-[28rem] resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-[13px] leading-5 text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30";

export function BodyEditor({ value, onChange, categorySlug, postId, preview, error }: Props) {
  const kind = structureFor(categorySlug);
  const spec = STRUCTURE_SPECS[kind];
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
  const hints = structureHints(value, kind);

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
      placeholder={`Markdown. Required H2s for ${spec.label.toLowerCase()}: ${spec.headings.join(", ")}.`}
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
            <Button size="sm" intent="ghost" onClick={() => onChange(spec.template)}>
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
              Structure looks good: all required sections for this article type are present.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
