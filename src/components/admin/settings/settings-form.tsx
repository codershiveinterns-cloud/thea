"use client";
import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AD_PLACEMENTS, POSTS_PER_DAY_MAX, SETTING_KEYS, adSlotSettingKey, type SettingKey } from "@/lib/constants";
import { saveSettings } from "@/lib/admin/settings";
import type { ActionResult } from "@/lib/admin/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, Notice } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";

/** Mirrors the max() on the AD_SLOT_* fields in settingsInputSchema (src/lib/validation.ts). */
const AD_SLOT_MAX_CHARS = 20000;
/** Locale pinned so the server-rendered count is byte-identical to what the browser hydrates, whatever its locale. */
const numberFormat = new Intl.NumberFormat("en-US");

const INITIAL_STATE: ActionResult = { ok: true };

type Values = Record<SettingKey, string>;

function isTrue(v: string) {
  return v === "true" || v === "1" || v === "on";
}

export function SettingsForm({ initial }: { initial: Values }) {
  const [state, formAction, pending] = useActionState(saveSettings, INITIAL_STATE);
  // Every control is controlled so React 19's post-action form reset can't wipe unsaved edits,
  // and so the ad-slot character counts update live.
  const [values, setValues] = useState<Values>(initial);
  // After a successful save, revalidatePath hands us the stored values (Zod may have trimmed some);
  // adopt them so the form reflects exactly what is in the DB. Compared by content, not identity,
  // so an unrelated re-render never clobbers in-progress edits.
  const initialKey = JSON.stringify(initial);
  const [syncedKey, setSyncedKey] = useState(initialKey);
  if (syncedKey !== initialKey) {
    setSyncedKey(initialKey);
    setValues(initial);
  }
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);

  const errors = !state.ok && state.errors ? state.errors : {};
  // The Save button sits under three cards, so after each result bring the feedback into view: focus the first
  // control with a field error (its message renders right under it), otherwise show the notice by the action row.
  useEffect(() => {
    if (!state.message) return;
    const fieldErrs = !state.ok && state.errors ? state.errors : {};
    const firstErrorKey = (Object.values(SETTING_KEYS) as SettingKey[]).find((k) => fieldErrs[k]);
    const control = firstErrorKey ? formRef.current?.elements.namedItem(firstErrorKey) : null;
    if (control instanceof HTMLElement) {
      control.focus({ preventScroll: true });
      control.scrollIntoView({ block: "center", behavior: "smooth" });
    } else {
      noticeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [state]);
  const dirty = (Object.keys(initial) as SettingKey[]).some((k) => values[k] !== initial[k]);

  function set(key: SettingKey, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      {/* 1. Pipeline */}
      <Card title="Pipeline">
        <div className="space-y-5">
          <Field
            label="Posts per day"
            htmlFor={`${id}-posts`}
            hint={`1–${POSTS_PER_DAY_MAX}`}
            error={errors.POSTS_PER_DAY}
            help="How many keywords each daily run turns into posts. Runs spread them across categories and a few hours apart."
            className="max-w-xs"
          >
            <Input
              id={`${id}-posts`}
              name="POSTS_PER_DAY"
              type="number"
              inputMode="numeric"
              min={1}
              max={POSTS_PER_DAY_MAX}
              step={1}
              required
              value={values.POSTS_PER_DAY}
              onChange={(e) => set("POSTS_PER_DAY", e.target.value)}
              aria-invalid={errors.POSTS_PER_DAY ? true : undefined}
            />
          </Field>

          <CheckboxRow
            id={`${id}-auto`}
            name="AUTO_PUBLISH"
            checked={isTrue(values.AUTO_PUBLISH)}
            onChange={(v) => set("AUTO_PUBLISH", v ? "true" : "false")}
            label="Auto-publish generated posts"
            error={errors.AUTO_PUBLISH}
            description={
              <>
                Off (default): every generated post lands in <strong>Review</strong> and nothing goes live until a human
                clicks Publish. On: a post is published immediately only when its quality score is{" "}
                <strong>85 or higher</strong> and the quality gate found <strong>no hallucinated identifiers</strong>{" "}
                (KB numbers, build numbers, error codes); anything below 85 or flagged still goes to Review. Auto-published
                posts show &ldquo;Verified: pending&rdquo; and appear in the &ldquo;Published today — verify&rdquo; queue
                until an editor adds screenshots and a tested-on build.
              </>
            }
          />

          <CheckboxRow
            id={`${id}-sched`}
            name="SCHEDULER_ENABLED"
            checked={isTrue(values.SCHEDULER_ENABLED)}
            onChange={(v) => set("SCHEDULER_ENABLED", v ? "true" : "false")}
            label="Daily scheduler"
            error={errors.SCHEDULER_ENABLED}
            description={
              <>
                Daily scheduler on/off — runs at <strong>09:00 local</strong> via <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">npm run scheduler</code>.
                When off, the scheduler process stays idle; &ldquo;Run pipeline now&rdquo; and{" "}
                <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">npm run generate</code> still work.
              </>
            }
          />
        </div>
      </Card>

      {/* 2. Ad slots */}
      <Card title="Ad slots">
        <div className="space-y-5">
          <Notice kind="warning">
            <strong>This HTML is injected as-is into public post pages</strong> — it is not sanitised or sandboxed, and
            any script in it runs in every reader&rsquo;s browser. Paste only ad code from your own ad account. Leave a
            slot empty to render nothing there.
          </Notice>

          {AD_PLACEMENTS.map((placement) => {
            const key = adSlotSettingKey(placement.key);
            const value = values[key];
            const count = value.length;
            const over = count > AD_SLOT_MAX_CHARS;
            const fieldId = `${id}-${placement.key}`;
            return (
              <Field
                key={key}
                label={placement.label}
                htmlFor={fieldId}
                hint={
                  <span className={over ? "font-medium text-red-600" : undefined} aria-live="polite">
                    {numberFormat.format(count)} / {numberFormat.format(AD_SLOT_MAX_CHARS)} characters
                  </span>
                }
                error={errors[key]}
                help={
                  <>
                    Setting key <code className="rounded bg-zinc-100 px-1 py-0.5">{key}</code>
                    {count === 0 ? " · empty — nothing is rendered in this slot" : null}
                  </>
                }
              >
                <Textarea
                  id={fieldId}
                  name={key}
                  rows={5}
                  spellCheck={false}
                  className="font-mono text-xs"
                  placeholder="<!-- your ad tag -->"
                  value={value}
                  onChange={(e) => set(key, e.target.value)}
                  aria-invalid={errors[key] || over ? true : undefined}
                />
              </Field>
            );
          })}
        </div>
      </Card>

      {/* 3. Search engines */}
      <Card
        title={
          <span className="inline-flex items-center gap-2">
            Search engines
            <Badge tone="bg-amber-50 text-amber-800 ring-amber-200">Used at go-live</Badge>
          </span>
        }
      >
        <div className="space-y-5">
          <p className="text-sm text-zinc-600">
            These are read once the site is deployed. Locally they are stored but have no effect.
          </p>

          <Field
            label="IndexNow key"
            htmlFor={`${id}-indexnow`}
            error={errors.INDEXNOW_KEY}
            help={
              <>
                Enables the IndexNow ping on publish and on update once the site is live. At go-live the key will also be
                served at <code className="rounded bg-zinc-100 px-1 py-0.5">/&#123;key&#125;.txt</code> so search engines
                can verify it — that route is not part of the local build.
              </>
            }
            className="max-w-lg"
          >
            <Input
              id={`${id}-indexnow`}
              name="INDEXNOW_KEY"
              type="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={128}
              className="font-mono"
              value={values.INDEXNOW_KEY}
              onChange={(e) => set("INDEXNOW_KEY", e.target.value)}
              aria-invalid={errors.INDEXNOW_KEY ? true : undefined}
            />
          </Field>

          <Field
            label="Google Analytics measurement ID"
            htmlFor={`${id}-ga`}
            error={errors.GA_MEASUREMENT_ID}
            help="The GA4 measurement ID from Admin → Data streams. Leave empty to load no analytics script."
            className="max-w-lg"
          >
            <Input
              id={`${id}-ga`}
              name="GA_MEASUREMENT_ID"
              type="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={40}
              className="font-mono"
              value={values.GA_MEASUREMENT_ID}
              onChange={(e) => set("GA_MEASUREMENT_ID", e.target.value)}
              aria-invalid={errors.GA_MEASUREMENT_ID ? true : undefined}
            />
          </Field>

          <Field
            label="Google Search Console verification"
            htmlFor={`${id}-gsc`}
            error={errors.GSC_VERIFICATION}
            help={
              <>
                The <code className="rounded bg-zinc-100 px-1 py-0.5">content</code> value of the{" "}
                <code className="rounded bg-zinc-100 px-1 py-0.5">google-site-verification</code> meta tag Search Console
                gives you — just the value, not the whole tag.
              </>
            }
            className="max-w-lg"
          >
            <Input
              id={`${id}-gsc`}
              name="GSC_VERIFICATION"
              type="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={200}
              className="font-mono"
              value={values.GSC_VERIFICATION}
              onChange={(e) => set("GSC_VERIFICATION", e.target.value)}
              aria-invalid={errors.GSC_VERIFICATION ? true : undefined}
            />
          </Field>
        </div>
      </Card>

      {/* The result renders next to Save, where the editor is looking after submitting. */}
      {state.message ? (
        <div ref={noticeRef}>
          <Notice kind={state.ok ? "success" : "error"}>{state.message}</Notice>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" intent="primary" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
        <Button type="button" intent="secondary" disabled={pending || !dirty} onClick={() => setValues(initial)}>
          Discard changes
        </Button>
        {dirty && !pending ? <span className="text-xs text-zinc-500">Unsaved changes</span> : null}
      </div>
    </form>
  );
}

function CheckboxRow({
  id,
  name,
  checked,
  onChange,
  label,
  description,
  error,
}: {
  id: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: ReactNode;
  error?: string;
}) {
  return (
    <div className="flex gap-3">
      <input
        id={id}
        name={name}
        type="checkbox"
        value="on"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30"
        aria-describedby={`${id}-desc`}
        aria-invalid={error ? true : undefined}
      />
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-zinc-800">
          {label}
        </label>
        <p id={`${id}-desc`} className="mt-1 text-xs leading-relaxed text-zinc-500">
          {description}
        </p>
        {error ? (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
