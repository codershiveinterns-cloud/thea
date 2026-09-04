import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings/settings-form";
import { SettingsReference } from "@/components/admin/settings/settings-reference";
import { Card, PageHeader } from "@/components/ui/card";
import { SETTING_DEFAULTS, type SettingKey } from "@/lib/constants";
import { db } from "@/lib/db";
import { getAllSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Settings" };

// Always read the live Setting table — never serve a build-time snapshot of admin config.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, rows] = await Promise.all([
    getAllSettings(),
    db.setting.findMany({ select: { key: true, updatedAt: true } }),
  ]);

  const savedAt: Partial<Record<SettingKey, Date>> = {};
  for (const row of rows) {
    if (row.key in SETTING_DEFAULTS) savedAt[row.key as SettingKey] = row.updatedAt;
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Pipeline behaviour, ad slot HTML per placement, and the search-engine keys wired up at go-live. Saving writes every value at once."
      />

      <SettingsForm initial={settings} />

      <div className="mt-8">
        <Card title="Effective values">
          <p className="mb-3 text-xs text-zinc-500">
            What the pipeline and the public site currently read, next to each built-in default. A key that was never
            saved falls back to its default.
          </p>
          <SettingsReference values={settings} savedAt={savedAt} />
        </Card>
      </div>
    </>
  );
}
