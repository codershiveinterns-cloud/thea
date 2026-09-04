"use server";
/**
 * Mutations for the Setting table. Reads live in src/lib/settings.ts.
 * Called from the /admin/settings form via React 19 useActionState.
 */
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { AD_PLACEMENTS, adSlotSettingKey, type SettingKey } from "@/lib/constants";
import { fdBool, fdString } from "@/lib/form";
import { fieldErrors, settingsInputSchema, type SettingsInput } from "@/lib/validation";
import { failResult, okResult, type ActionResult } from "./types";

/** Pull the raw form values into the shape settingsInputSchema expects (still unvalidated). */
function readSettingsForm(fd: FormData): Record<string, string | boolean> {
  const adSlots = Object.fromEntries(
    AD_PLACEMENTS.map((p) => {
      const key = adSlotSettingKey(p.key);
      return [key, fdString(fd, key)];
    }),
  );
  return {
    POSTS_PER_DAY: fdString(fd, "POSTS_PER_DAY"),
    AUTO_PUBLISH: fdBool(fd, "AUTO_PUBLISH"),
    SCHEDULER_ENABLED: fdBool(fd, "SCHEDULER_ENABLED"),
    INDEXNOW_KEY: fdString(fd, "INDEXNOW_KEY"),
    GA_MEASUREMENT_ID: fdString(fd, "GA_MEASUREMENT_ID"),
    GSC_VERIFICATION: fdString(fd, "GSC_VERIFICATION"),
    ...adSlots,
  };
}

/** Setting.value is a string column; numbers and booleans are stored as their canonical string form. */
function toStoredValues(input: SettingsInput): Array<{ key: SettingKey; value: string }> {
  return (Object.keys(input) as SettingKey[]).map((key) => {
    const v = input[key];
    return { key, value: typeof v === "string" ? v : String(v) };
  });
}

/**
 * Save every setting at once. Form field names match SETTING_KEYS
 * (checkboxes are read with fdBool, so an unchecked box is stored as "false").
 */
export async function saveSettings(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = settingsInputSchema.safeParse(readSettingsForm(formData));
  if (!parsed.success) {
    return failResult("Some settings are invalid. Fix the highlighted fields and save again.", fieldErrors(parsed.error));
  }

  const rows = toStoredValues(parsed.data);
  try {
    await db.$transaction(
      rows.map(({ key, value }) =>
        db.setting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    );
  } catch (err) {
    console.error("[settings] save failed", err);
    return failResult("Saving failed. Nothing was changed — check the server log.");
  }

  revalidatePath("/admin/settings");
  revalidatePath("/");
  return okResult("Settings saved");
}
