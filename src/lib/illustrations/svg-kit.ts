/**
 * Low-level SVG primitives for the Windows 11 Settings illustrations. Pure string builders —
 * no DOM, no canvas, so they run anywhere (pipeline scripts, tests, route handlers). Every
 * illustration built from these is an original, hand-drawn approximation of Fluent Design
 * layout conventions — colours, spacing and simple geometric icons — never a traced or
 * copied screenshot of a real Windows dialog.
 */
import { xmlEscape } from "@/lib/xml";

/** Windows 11 light-theme palette, approximated (public UI convention colours, not proprietary assets). */
export const PALETTE = {
  navBg: "#F3F3F3",
  contentBg: "#FBFBFB",
  cardBg: "#FFFFFF",
  border: "#E5E5E5",
  borderStrong: "#D6D6D6",
  divider: "#EFEFEF",
  textPrimary: "#1B1B1B",
  textSecondary: "#5C5C5C",
  textMuted: "#8A8A8A",
  accent: "#0067C0",
  accentSoft: "#E8F2FC",
  success: "#0F7A46",
  white: "#FFFFFF",
} as const;

export function esc(text: string): string {
  return xmlEscape(text);
}

export function rect(x: number, y: number, w: number, h: number, opts: { fill?: string; stroke?: string; strokeWidth?: number; rx?: number } = {}): string {
  const { fill = "none", stroke, strokeWidth = 1, rx = 0 } = opts;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${strokeWidth}"` : ""}/>`;
}

export function circle(cx: number, cy: number, r: number, opts: { fill?: string; stroke?: string; strokeWidth?: number } = {}): string {
  const { fill = "none", stroke, strokeWidth = 1 } = opts;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${strokeWidth}"` : ""}/>`;
}

export function line(x1: number, y1: number, x2: number, y2: number, stroke: string, strokeWidth = 1): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

export type TextOpts = { size?: number; weight?: number; fill?: string; anchor?: "start" | "middle" | "end"; family?: string };

export function text(x: number, y: number, value: string, opts: TextOpts = {}): string {
  const { size = 15, weight = 400, fill = PALETTE.textPrimary, anchor = "start", family = "Segoe UI, -apple-system, sans-serif" } = opts;
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(value)}</text>`;
}

/** A pill-shaped on/off toggle switch. */
export function toggle(x: number, y: number, on: boolean): string {
  const w = 40, h = 20, r = h / 2;
  const fill = on ? PALETTE.accent : "#8A8A8A";
  const knobCx = on ? x + w - r : x + r;
  return `<g>${rect(x, y, w, h, { fill, rx: r })}${circle(knobCx, y + r, r - 4, { fill: PALETTE.white })}</g>`;
}

/** Small rounded button with centred label. */
export function button(x: number, y: number, w: number, label: string, opts: { primary?: boolean; highlighted?: boolean } = {}): string {
  const h = 32;
  const { primary = true, highlighted = false } = opts;
  const fill = primary ? PALETTE.accent : PALETTE.white;
  const stroke = primary ? PALETTE.accent : PALETTE.borderStrong;
  const textFill = primary ? PALETTE.white : PALETTE.textPrimary;
  const ring = highlighted ? highlightRing(x - 4, y - 4, w + 8, h + 8, 10) : "";
  return `${ring}<g>${rect(x, y, w, h, { fill, stroke, strokeWidth: 1, rx: 6 })}${text(x + w / 2, y + h / 2 + 5, label, { size: 13, weight: 600, fill: textFill, anchor: "middle" })}</g>`;
}

/** Chevron ">" affordance used at the end of a navigable settings row. */
export function chevron(x: number, y: number): string {
  return `<path d="M ${x} ${y - 6} L ${x + 6} ${y} L ${x} ${y + 6}" stroke="${PALETTE.textMuted}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** Check mark inside a small filled square, for a ticked checkbox. */
export function checkbox(x: number, y: number, checked: boolean): string {
  const s = 18;
  if (!checked) return rect(x, y, s, s, { fill: PALETTE.white, stroke: PALETTE.borderStrong, strokeWidth: 1.4, rx: 4 });
  return `${rect(x, y, s, s, { fill: PALETTE.accent, rx: 4 })}<path d="M ${x + 4} ${y + 9} L ${x + 7.5} ${y + 13} L ${x + 14} ${y + 5}" stroke="${PALETTE.white}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** Soft dashed accent outline used to call out the one control a post's step is pointing at. */
export function highlightRing(x: number, y: number, w: number, h: number, rx = 8): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="${PALETTE.accent}" stroke-width="2" stroke-dasharray="6 4" opacity="0.9"/>`;
}

/** A coloured rounded-square "icon chip" with a simple geometric glyph — an approximation of a Fluent icon, not a traced asset. */
export function iconChip(x: number, y: number, size: number, bg: string, glyph: string): string {
  return `<g>${rect(x, y, size, size, { fill: bg, rx: size * 0.28 })}${glyph}</g>`;
}

function glyphPath(cx: number, cy: number, d: string): string {
  return `<path d="${d}" stroke="${PALETTE.white}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="translate(${cx} ${cy})"/>`;
}

/** Simple geometric glyphs (not Fluent icon-font tracings) keyed by name, centred at (0,0) in the transform. */
export const GLYPHS: Record<string, (cx: number, cy: number) => string> = {
  cloudUpdate: (cx, cy) => glyphPath(cx, cy, "M -6 3 a4 4 0 0 1 0 -8 a5 5 0 0 1 9.6 -1.6 A4 4 0 0 1 8 3 Z M 0 6 l 0 -6 m -2.4 2.4 L 0 0 l 2.4 2.4"),
  gear: (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="4.5" fill="none" stroke="${PALETTE.white}" stroke-width="1.6"/>` + [0, 60, 120, 180, 240, 300].map((deg) => {
    const r1 = 6.2, r2 = 8.2, rad = (deg * Math.PI) / 180;
    const x1 = cx + r1 * Math.cos(rad), y1 = cy + r1 * Math.sin(rad), x2 = cx + r2 * Math.cos(rad), y2 = cy + r2 * Math.sin(rad);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${PALETTE.white}" stroke-width="2" stroke-linecap="round"/>`;
  }).join(""),
  puzzle: (cx, cy) => glyphPath(cx, cy, "M -7 -2 h4 a2 2 0 1 1 0 4 h-4 v4 h4 a2 2 0 1 0 0 -4 M 3 -6 v4 h4 v10 h-14 v-10 h4 v-4 a3 3 0 0 1 6 0 Z"),
  shield: (cx, cy) => glyphPath(cx, cy, "M 0 -8 L 7 -5 V 2 C 7 6 3.5 8.5 0 10 C -3.5 8.5 -7 6 -7 2 V -5 Z M -3 0 L -0.5 2.5 L 3.5 -2.5"),
  brush: (cx, cy) => glyphPath(cx, cy, "M -6 8 L -2 4 M -2 4 L 4 -6 a2 2 0 0 1 3 3 L -3 3 Z"),
  wrench: (cx, cy) => glyphPath(cx, cy, "M -2 2 L -7 7 a2 2 0 0 0 3 3 L 1 5 M 1 5 a5 5 0 1 0 4 -8 l -2.5 2.5 l -2 -2 L 3 -5 a5 5 0 0 0 -2 7"),
  apps: (cx, cy) => [[-5, -5], [0, -5], [5, -5], [-5, 0], [0, 0], [5, 0], [-5, 5], [0, 5], [5, 5]].map(([dx, dy]) => `<circle cx="${cx + dx}" cy="${cy + dy}" r="1.6" fill="${PALETTE.white}"/>`).join(""),
  info: (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="8" fill="none" stroke="${PALETTE.white}" stroke-width="1.6"/><circle cx="${cx}" cy="${cy - 3.5}" r="1" fill="${PALETTE.white}"/><line x1="${cx}" y1="${cy - 1}" x2="${cx}" y2="${cy + 4}" stroke="${PALETTE.white}" stroke-width="1.6" stroke-linecap="round"/>`,
  history: (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="7.5" fill="none" stroke="${PALETTE.white}" stroke-width="1.6"/><path d="M ${cx} ${cy - 4} L ${cx} ${cy} L ${cx + 3.5} ${cy + 2}" stroke="${PALETTE.white}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  refresh: (cx, cy) => glyphPath(cx, cy, "M -7 0 a7 7 0 1 1 2 5 M -7 0 l 0 -4 m 0 4 l 4 0"),
  taskbar: (cx, cy) => `${rect(cx - 8, cy - 6, 16, 10, { fill: "none", stroke: PALETTE.white, strokeWidth: 1.4, rx: 1.5 })}${rect(cx - 8, cy + 5, 16, 2.5, { fill: PALETTE.white, rx: 1 })}`,
};
