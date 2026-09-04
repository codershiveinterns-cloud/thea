import { adSlotSettingKey, type AdPlacementKey } from "@/lib/constants";
import { getSetting } from "@/lib/settings";

/**
 * Renders the editor-supplied ad HTML for a placement, or nothing when the slot is empty.
 * The HTML comes from the Setting table (admin only) — never from AI output or users.
 */
export async function AdSlot({ placement, className = "" }: { placement: AdPlacementKey; className?: string }) {
  const html = (await getSetting(adSlotSettingKey(placement))).trim();
  if (!html) return null;
  return (
    <aside aria-label="Advertisement" data-placement={placement} className={`my-8 ${className}`}>
      <p className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">Advertisement</p>
      <div className="min-h-[90px]" dangerouslySetInnerHTML={{ __html: html }} />
    </aside>
  );
}
