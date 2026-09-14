/**
 * The Settings-app "chrome": title bar, left navigation rail and the content-area frame that
 * every screen illustration sits inside. One shared layout so all screens look like the same
 * app, approximating Fluent Design conventions (rounded window, light theme, icon nav rail).
 */
import { PALETTE, GLYPHS, circle, iconChip, rect, text } from "./svg-kit";

export const CANVAS = { width: 1200, height: 630 } as const;
const NAV_WIDTH = 300;
const TITLEBAR_H = 40;

export type NavKey = "system" | "windowsUpdate" | "apps" | "personalization" | "privacy";

const NAV_ITEMS: { key: NavKey; label: string; glyph: keyof typeof GLYPHS; bg: string }[] = [
  { key: "system", label: "System", glyph: "gear", bg: "#5B5FC7" },
  { key: "personalization", label: "Personalization", glyph: "brush", bg: "#C239B3" },
  { key: "apps", label: "Apps", glyph: "puzzle", bg: "#0F7A46" },
  { key: "privacy", label: "Privacy & security", glyph: "shield", bg: "#B4009E" },
  { key: "windowsUpdate", label: "Windows Update", glyph: "cloudUpdate", bg: "#0067C0" },
];

function titleBar(): string {
  const dots = [PALETTE.textMuted, PALETTE.textMuted, "#E81123"].map((fill, i) => circle(CANVAS.width - 24 - i * 24, TITLEBAR_H / 2, 5, { fill })).join("");
  return `${rect(0, 0, CANVAS.width, TITLEBAR_H, { fill: PALETTE.navBg })}${text(20, TITLEBAR_H / 2 + 5, "Settings", { size: 13, weight: 600, fill: PALETTE.textSecondary })}${dots}${rect(0, TITLEBAR_H - 1, CANVAS.width, 1, { fill: PALETTE.border })}`;
}

function navRail(activeKey: NavKey): string {
  const top = TITLEBAR_H;
  const rows: string[] = [
    rect(0, top, NAV_WIDTH, CANVAS.height - top, { fill: PALETTE.navBg }),
    circle(40, top + 44, 18, { fill: "#8B8CC7" }),
    text(70, top + 40, "This PC", { size: 14, weight: 600 }),
    text(70, top + 58, "Local account", { size: 11, fill: PALETTE.textSecondary }),
  ];
  let y = top + 96;
  for (const item of NAV_ITEMS) {
    const active = item.key === activeKey;
    if (active) rows.push(rect(12, y - 6, NAV_WIDTH - 24, 44, { fill: PALETTE.accentSoft, rx: 8 }), rect(12, y - 6, 3, 44, { fill: PALETTE.accent, rx: 2 }));
    rows.push(iconChip(28, y, 28, item.bg, GLYPHS[item.glyph](28 + 14, y + 14)));
    rows.push(text(70, y + 19, item.label, { size: 13.5, weight: active ? 600 : 400, fill: active ? PALETTE.accent : PALETTE.textPrimary }));
    y += 52;
  }
  rows.push(rect(NAV_WIDTH - 1, top, 1, CANVAS.height - top, { fill: PALETTE.border }));
  return `<g>${rows.join("")}</g>`;
}

/** Breadcrumb + big page icon + title, the standard Settings sub-page header. */
export function pageHeader(breadcrumb: string, pageTitle: string, glyph: keyof typeof GLYPHS, iconBg: string): string {
  const top = TITLEBAR_H + 28;
  const left = NAV_WIDTH + 40;
  return [
    text(left, top, breadcrumb, { size: 12.5, fill: PALETTE.textMuted }),
    iconChip(left, top + 16, 44, iconBg, GLYPHS[glyph](left + 22, top + 16 + 22)),
    text(left + 58, top + 46, pageTitle, { size: 23, weight: 600 }),
  ].join("");
}

/** Full-canvas frame: title bar + nav rail + white content background, ready for a screen's own content group. */
export function frame(activeKey: NavKey, content: string): string {
  const top = TITLEBAR_H;
  const contentBg = rect(NAV_WIDTH, top, CANVAS.width - NAV_WIDTH, CANVAS.height - top, { fill: PALETTE.contentBg });
  const outer = rect(0.5, 0.5, CANVAS.width - 1, CANVAS.height - 1, { fill: "none", stroke: PALETTE.borderStrong, strokeWidth: 1, rx: 10 });
  return `<svg width="${CANVAS.width}" height="${CANVAS.height}" viewBox="0 0 ${CANVAS.width} ${CANVAS.height}" xmlns="http://www.w3.org/2000/svg"><rect width="${CANVAS.width}" height="${CANVAS.height}" rx="10" fill="${PALETTE.white}"/>${titleBar()}${contentBg}${navRail(activeKey)}${content}${outer}</svg>`;
}

export const CONTENT_LEFT = NAV_WIDTH + 40;
export const CONTENT_RIGHT = CANVAS.width - 40;
export const CONTENT_TOP = TITLEBAR_H + 110;
