/**
 * Card/row building blocks shared by every screen — the repeating "grouped settings list"
 * pattern used throughout the real Settings app, approximated with plain rects and rows.
 */
import { CONTENT_LEFT, CONTENT_RIGHT } from "./shell";
import { PALETTE, chevron, line, rect, text, toggle, checkbox, button, highlightRing, type GLYPHS } from "./svg-kit";

const CARD_WIDTH = CONTENT_RIGHT - CONTENT_LEFT;

export type RowControl =
  | { type: "chevron" }
  | { type: "toggle"; on: boolean }
  | { type: "checkbox"; checked: boolean }
  | { type: "button"; label: string }
  | { type: "text"; value: string }
  | { type: "none" };

export type Row = {
  glyph?: keyof typeof GLYPHS;
  glyphBg?: string;
  label: string;
  sublabel?: string;
  control: RowControl;
  highlighted?: boolean;
};

const ROW_H = 62;

function renderControl(control: RowControl, x: number, yMid: number): string {
  switch (control.type) {
    case "chevron":
      return chevron(x, yMid);
    case "toggle":
      return toggle(x - 40, yMid - 10, control.on);
    case "checkbox":
      return checkbox(x - 18, yMid - 9, control.checked);
    case "button":
      return button(x - 118, yMid - 16, 118, control.label, { primary: true });
    case "text":
      return text(x, yMid + 5, control.value, { size: 13, fill: PALETTE.textSecondary, anchor: "end" });
    case "none":
    default:
      return "";
  }
}

/** One grouped card (rounded rect, 1px border) containing a list of rows with dividers between them. */
export function card(x: number, y: number, rows: Row[], glyphFn: (name: keyof typeof GLYPHS, cx: number, cy: number, bg: string) => string): string {
  const h = rows.length * ROW_H;
  const parts: string[] = [rect(x, y, CARD_WIDTH, h, { fill: PALETTE.cardBg, stroke: PALETTE.border, strokeWidth: 1, rx: 8 })];
  rows.forEach((row, i) => {
    const rowY = y + i * ROW_H;
    const yMid = rowY + ROW_H / 2;
    let cursor = x + 20;
    if (row.glyph) {
      parts.push(glyphFn(row.glyph, cursor, yMid, row.glyphBg ?? "#6B6FCF"));
      cursor += 44;
    }
    parts.push(text(cursor, yMid + (row.sublabel ? -3 : 5), row.label, { size: 14.5, weight: 500 }));
    if (row.sublabel) parts.push(text(cursor, yMid + 16, row.sublabel, { size: 12, fill: PALETTE.textSecondary }));
    parts.push(renderControl(row.control, x + CARD_WIDTH - 20, yMid));
    if (row.highlighted) parts.push(highlightRing(x - 6, rowY - 4, CARD_WIDTH + 12, ROW_H + 8, 10));
    if (i < rows.length - 1) parts.push(line(x + 16, rowY + ROW_H, x + CARD_WIDTH - 16, rowY + ROW_H, PALETTE.divider));
  });
  return parts.join("");
}

export function cardWithIconGlyphs(x: number, y: number, rows: Row[], GLYPHS_MAP: typeof GLYPHS): string {
  return card(x, y, rows, (name, cx, cy, bg) => {
    const size = 32;
    return `${rect(cx - size / 2, cy - size / 2, size, size, { fill: bg, rx: size * 0.3 })}${GLYPHS_MAP[name](cx, cy)}`;
  });
}

export function sectionLabel(x: number, y: number, value: string): string {
  return text(x, y, value, { size: 13, weight: 600, fill: PALETTE.textSecondary });
}

export { CARD_WIDTH };
