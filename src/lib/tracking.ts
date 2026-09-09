/**
 * Which optional tracking is switched on. Analytics comes from env NEXT_PUBLIC_GA_ID or Setting
 * GA_MEASUREMENT_ID; ads are "enabled" when any ad-slot setting has HTML. The privacy and cookie
 * pages, the consent banner and the GA loader all read this so they never disagree.
 */
import { AD_PLACEMENTS, SETTING_KEYS, adSlotSettingKey } from "./constants";
import { getAllSettings } from "./settings";

export type TrackingConfig = { gaId: string | null; adsEnabled: boolean; anyEnabled: boolean };

export function normalizeGaId(raw: string | undefined | null): string | null {
  const id = (raw ?? "").trim();
  return /^G-[A-Z0-9]+$/.test(id) ? id : null;
}

export async function getTrackingConfig(): Promise<TrackingConfig> {
  const settings = await getAllSettings();
  const gaId = normalizeGaId(process.env.NEXT_PUBLIC_GA_ID) ?? normalizeGaId(settings[SETTING_KEYS.GA_MEASUREMENT_ID]);
  const adsEnabled = AD_PLACEMENTS.some((p) => settings[adSlotSettingKey(p.key)].trim().length > 0);
  return { gaId, adsEnabled, anyEnabled: Boolean(gaId) || adsEnabled };
}
