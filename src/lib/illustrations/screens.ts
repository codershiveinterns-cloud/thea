/**
 * The catalogue of Windows 11 Settings screens Thea can illustrate, and the (pure, testable)
 * logic that decides which screen a given piece of post text is talking about. Every screen is
 * a hand-built approximation of a real Settings page's layout — nav item, breadcrumb, page
 * icon and the handful of grouped rows a reader would actually see — not a reproduction of any
 * specific build's exact pixels or copy.
 */
import { CONTENT_LEFT, CONTENT_TOP, frame, pageHeader, type NavKey } from "./shell";
import { cardWithIconGlyphs, sectionLabel, type Row } from "./content";
import { GLYPHS } from "./svg-kit";

export type ScreenId =
  | "windows-update"
  | "optional-updates"
  | "update-history"
  | "troubleshoot"
  | "recovery"
  | "windows-security"
  | "apps-installed"
  | "about"
  | "personalization-taskbar";

export type ScreenDef = {
  id: ScreenId;
  /** Human caption fragment, e.g. "the Windows Update page" — always used after the word "Illustration". */
  caption: string;
  navKey: NavKey;
  breadcrumb: string;
  pageTitle: string;
  headerGlyph: keyof typeof GLYPHS;
  headerBg: string;
  /** Build the rows for the given highlight index (which row/control the post step is pointing at). */
  rows: (highlight: number) => Row[];
};

const hi = (rows: Row[], highlight: number): Row[] => rows.map((r, i) => (i === highlight % rows.length ? { ...r, highlighted: true } : r));

export const SCREENS: Record<ScreenId, ScreenDef> = {
  "windows-update": {
    id: "windows-update",
    caption: "the Windows Update page in Windows 11 Settings",
    navKey: "windowsUpdate",
    breadcrumb: "Settings",
    pageTitle: "Windows Update",
    headerGlyph: "cloudUpdate",
    headerBg: "#0067C0",
    rows: (h) =>
      hi(
        [
          { glyph: "cloudUpdate", glyphBg: "#0067C0", label: "You're up to date", sublabel: "Last checked: a few minutes ago", control: { type: "button", label: "Check for updates" } },
          { glyph: "history", glyphBg: "#5B5FC7", label: "Update history", control: { type: "chevron" } },
          { glyph: "refresh", glyphBg: "#8A8A8A", label: "Advanced options", sublabel: "Optional updates, delivery, pause", control: { type: "chevron" } },
        ],
        h,
      ),
  },
  "optional-updates": {
    id: "optional-updates",
    caption: "the Optional updates page under Windows Update > Advanced options",
    navKey: "windowsUpdate",
    breadcrumb: "Settings > Windows Update > Advanced options",
    pageTitle: "Optional updates",
    headerGlyph: "cloudUpdate",
    headerBg: "#0067C0",
    rows: (h) =>
      hi(
        [
          { glyph: "puzzle", glyphBg: "#0F7A46", label: "Driver updates", sublabel: "1 update available", control: { type: "checkbox", checked: true } },
          { glyph: "wrench", glyphBg: "#8A8A8A", label: "Feature updates", sublabel: "No updates pending", control: { type: "checkbox", checked: false } },
          { glyph: "cloudUpdate", glyphBg: "#0067C0", label: "Quality updates", sublabel: "1 update available", control: { type: "checkbox", checked: true } },
        ],
        h,
      ),
  },
  "update-history": {
    id: "update-history",
    caption: "the Update history page under Windows Update",
    navKey: "windowsUpdate",
    breadcrumb: "Settings > Windows Update",
    pageTitle: "Update history",
    headerGlyph: "history",
    headerBg: "#5B5FC7",
    rows: (h) =>
      hi(
        [
          { glyph: "cloudUpdate", glyphBg: "#0067C0", label: "Feature update to Windows 11", sublabel: "Installed", control: { type: "text", value: "Recently" } },
          { glyph: "cloudUpdate", glyphBg: "#0067C0", label: "Cumulative update", sublabel: "Installed", control: { type: "text", value: "Last month" } },
          { glyph: "wrench", glyphBg: "#8A8A8A", label: "Uninstall updates", control: { type: "chevron" } },
        ],
        h,
      ),
  },
  troubleshoot: {
    id: "troubleshoot",
    caption: "the Troubleshoot > Other troubleshooters page under Settings > System",
    navKey: "system",
    breadcrumb: "Settings > System > Troubleshoot",
    pageTitle: "Other troubleshooters",
    headerGlyph: "wrench",
    headerBg: "#8A8A8A",
    rows: (h) =>
      hi(
        [
          { glyph: "cloudUpdate", glyphBg: "#0067C0", label: "Windows Update", control: { type: "button", label: "Run" } },
          { glyph: "puzzle", glyphBg: "#0F7A46", label: "Bluetooth", control: { type: "button", label: "Run" } },
          { glyph: "wrench", glyphBg: "#8A8A8A", label: "Network Adapter", control: { type: "button", label: "Run" } },
        ],
        h,
      ),
  },
  recovery: {
    id: "recovery",
    caption: "the Recovery page under Settings > System",
    navKey: "system",
    breadcrumb: "Settings > System",
    pageTitle: "Recovery",
    headerGlyph: "refresh",
    headerBg: "#8A8A8A",
    rows: (h) =>
      hi(
        [
          { glyph: "refresh", glyphBg: "#8A8A8A", label: "Reset this PC", sublabel: "Keep or remove your files", control: { type: "button", label: "Reset PC" } },
          { glyph: "wrench", glyphBg: "#0067C0", label: "Advanced startup", sublabel: "Start up from a device or disc", control: { type: "button", label: "Restart now" } },
        ],
        h,
      ),
  },
  "windows-security": {
    id: "windows-security",
    caption: "the Windows Security app home page",
    navKey: "privacy",
    breadcrumb: "Windows Security",
    pageTitle: "Protection areas",
    headerGlyph: "shield",
    headerBg: "#B4009E",
    rows: (h) =>
      hi(
        [
          { glyph: "shield", glyphBg: "#0F7A46", label: "Virus & threat protection", sublabel: "No action needed", control: { type: "chevron" } },
          { glyph: "shield", glyphBg: "#0067C0", label: "Firewall & network protection", control: { type: "chevron" } },
          { glyph: "shield", glyphBg: "#B4009E", label: "App & browser control", control: { type: "chevron" } },
        ],
        h,
      ),
  },
  "apps-installed": {
    id: "apps-installed",
    caption: "the Installed apps page under Settings > Apps",
    navKey: "apps",
    breadcrumb: "Settings > Apps",
    pageTitle: "Installed apps",
    headerGlyph: "apps",
    headerBg: "#0F7A46",
    rows: (h) =>
      hi(
        [
          { glyph: "apps", glyphBg: "#0067C0", label: "Mail and Calendar", sublabel: "Microsoft Corporation", control: { type: "button", label: "..." } },
          { glyph: "apps", glyphBg: "#8A8A8A", label: "A third-party app", sublabel: "150 MB", control: { type: "button", label: "..." } },
        ],
        h,
      ),
  },
  about: {
    id: "about",
    caption: "the About page under Settings > System",
    navKey: "system",
    breadcrumb: "Settings > System",
    pageTitle: "About",
    headerGlyph: "info",
    headerBg: "#0067C0",
    rows: (h) =>
      hi(
        [
          { label: "Device name", control: { type: "text", value: "DESKTOP-PC" } },
          { label: "Edition", control: { type: "text", value: "Windows 11" } },
          { label: "Installed on", control: { type: "text", value: "—" } },
          { label: "OS build", control: { type: "text", value: "—" } },
        ],
        h,
      ),
  },
  "personalization-taskbar": {
    id: "personalization-taskbar",
    caption: "the Taskbar page under Settings > Personalization",
    navKey: "personalization",
    breadcrumb: "Settings > Personalization",
    pageTitle: "Taskbar",
    headerGlyph: "taskbar",
    headerBg: "#C239B3",
    rows: (h) =>
      hi(
        [
          { glyph: "taskbar", glyphBg: "#0067C0", label: "Search", control: { type: "toggle", on: true } },
          { glyph: "taskbar", glyphBg: "#5B5FC7", label: "Task view", control: { type: "toggle", on: true } },
          { glyph: "taskbar", glyphBg: "#8A8A8A", label: "Widgets", control: { type: "toggle", on: false } },
        ],
        h,
      ),
  },
};

export const DEFAULT_SCREEN: ScreenId = "windows-update";

type DetectionRule = { test: (text: string) => boolean; screen: ScreenId };

const matches = (re: RegExp) => (text: string) => re.test(text);

/**
 * Ordered rules; first match wins, so more specific screens are listed before the generic
 * Windows Update fallback. Taskbar detection needs two signals, not just the bare word
 * "taskbar" — plenty of unrelated fixes mention "the speaker icon in the taskbar" in passing
 * without the post being about the Taskbar personalization page.
 */
const DETECTION_RULES: DetectionRule[] = [
  { test: matches(/optional update/i), screen: "optional-updates" },
  { test: matches(/update history/i), screen: "update-history" },
  { test: matches(/troubleshoot/i), screen: "troubleshoot" },
  { test: matches(/reset this pc|factory reset|advanced startup|\brecovery\b/i), screen: "recovery" },
  { test: matches(/windows security|virus (?:&|and) threat|windows defender|antivirus/i), screen: "windows-security" },
  { test: matches(/installed apps|uninstall|apps (?:&|and) features/i), screen: "apps-installed" },
  { test: matches(/\babout\b page|winver|\bos build\b|check your (?:windows )?build|build number/i), screen: "about" },
  {
    // "taskbar" alone is too common in unrelated fixes ("click the speaker icon in the taskbar");
    // require it to co-occur with "personalization", the Settings section it actually lives in.
    test: (text) => /\bcopilot\b/i.test(text) || (/\btaskbar\b/i.test(text) && /\bpersonalization\b/i.test(text)),
    screen: "personalization-taskbar",
  },
  { test: matches(/windows update|check for updates|cumulative update|\bkb\d{6,7}\b/i), screen: "windows-update" },
];

/** Pure: which screen (if any) a piece of text is talking about. Returns null when nothing matches. */
export function detectScreenForText(text: string): ScreenId | null {
  for (const rule of DETECTION_RULES) if (rule.test(text)) return rule.screen;
  return null;
}

/** Render one screen's full-canvas SVG document at a given highlight index. */
export function renderScreenSvg(screenId: ScreenId, highlight = 0): string {
  const def = SCREENS[screenId];
  const header = pageHeader(def.breadcrumb, def.pageTitle, def.headerGlyph, def.headerBg);
  // Real Settings sub-pages only show a small group label above the first card on a few screens
  // (e.g. About's "Device specifications"); everywhere else the card sits directly under the title.
  const listLabel = def.id === "about" ? sectionLabel(CONTENT_LEFT, CONTENT_TOP - 14, "Device specifications") : "";
  const body = cardWithIconGlyphs(CONTENT_LEFT, CONTENT_TOP, def.rows(highlight), GLYPHS);
  return frame(def.navKey, `${header}${listLabel}${body}`);
}

/** "Illustration: the Windows Update page in Windows 11 Settings" — never the word "Screenshot". */
export function captionFor(screenId: ScreenId): string {
  return `Illustration: ${SCREENS[screenId].caption}`;
}
