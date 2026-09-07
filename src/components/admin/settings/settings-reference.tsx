import { SETTING_DEFAULTS, SETTING_KEYS, type SettingKey } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";

type Props = {
  /** Effective values (saved value, or the default when nothing is saved). */
  values: Record<SettingKey, string>;
  /** When each key was last saved; missing = never saved, default applies. */
  savedAt: Partial<Record<SettingKey, Date>>;
};

function display(key: SettingKey, value: string): string {
  if (value === "") return "(empty)";
  // Ad HTML can be long — the textarea above is the place to read it.
  if (key.startsWith("AD_SLOT_")) return `${value.length.toLocaleString("en-US")} characters of HTML`;
  return value;
}

/** Read-only table of the effective value of every setting next to its default. */
export function SettingsReference({ values, savedAt }: Props) {
  const keys = (Object.values(SETTING_KEYS) as SettingKey[]).filter((k) => k !== SETTING_KEYS.PIPELINE_LAST_RUN);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-zinc-500">
          <tr className="border-b border-zinc-200">
            <th scope="col" className="py-2 pr-4 font-medium">
              Key
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Effective value
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Default
            </th>
            <th scope="col" className="py-2 font-medium">
              Last saved
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {keys.map((key) => {
            const effective = values[key];
            const def = SETTING_DEFAULTS[key];
            const saved = savedAt[key];
            const isDefault = effective === def;
            return (
              <tr key={key} className="align-top">
                <td className="py-2 pr-4 font-mono text-xs text-zinc-700">{key}</td>
                <td className={`py-2 pr-4 ${isDefault ? "text-zinc-500" : "font-medium text-zinc-900"}`}>
                  <span className="break-all">{display(key, effective)}</span>
                </td>
                <td className="py-2 pr-4 text-zinc-500">{display(key, def)}</td>
                <td className="py-2 whitespace-nowrap text-zinc-500">
                  {saved ? formatDateTime(saved) : <span className="italic">never — using default</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
