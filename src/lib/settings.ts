/** Read-side helpers for the Setting table. Mutations live in src/lib/admin/settings.ts. */
import { db } from "./db";
import { SETTING_DEFAULTS, type SettingKey } from "./constants";

export async function getSetting(key: SettingKey): Promise<string> {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? SETTING_DEFAULTS[key];
}

export async function getAllSettings(): Promise<Record<SettingKey, string>> {
  const rows = await db.setting.findMany();
  const out = { ...SETTING_DEFAULTS };
  for (const r of rows) if (r.key in out) out[r.key as SettingKey] = r.value;
  return out;
}

export function settingBool(value: string): boolean {
  return value === "true" || value === "1" || value === "on";
}

export function settingInt(value: string, fallback: number): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}
