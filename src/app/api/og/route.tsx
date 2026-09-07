/**
 * /api/og?title=…&category=… — 1200×630 branded Open Graph image.
 * Used as the default social image for every page and as the fallback featured image for posts
 * (see ogImagePath / featuredImageFor in src/lib/seo.ts) and by the pipeline's featured-image step.
 *
 * Rendering goes through Satori (next/og), which supports a CSS subset: flexbox only, explicit
 * display:flex on every element with more than one child, no grid, no CSS variables.
 *
 * Fonts: next/og bundles exactly one face (Noto Sans Regular, registered for every weight) and this
 * route deliberately loads nothing else — no network fetch, no font file. That keeps the bytes for a
 * given URL deterministic, so the one-year immutable Cache-Control below is truthful, and it keeps
 * the home hero's LCP image off the network path. Headline weight comes from a thin text stroke in
 * the fill colour (the same technique browsers use for synthetic bold), see boldStyle().
 */
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { CATEGORY_SLUGS, SITE, categoryBySlug } from "@/lib/constants";

const WIDTH = 1200;
const HEIGHT = 630;
const BLUE_600 = "#2563eb";
const BLUE_700 = "#1d4ed8";
const ZINC_900 = "#18181b";
const ZINC_600 = "#52525b";
const WHITE = "#ffffff";
/** Satori clamps the title to this many lines and appends "…" (only honoured with display:block). */
const TITLE_MAX_LINES = 4;

const querySchema = z.object({
  title: z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1, "title is required").max(140, "title must be 140 characters or fewer")),
  category: z.enum(CATEGORY_SLUGS).optional(),
});

/** Title size steps down with length so long keywords still fit on four lines. */
function titleFontSize(title: string): number {
  if (title.length <= 40) return 72;
  if (title.length <= 80) return 60;
  return 48;
}

/**
 * Synthetic bold for the bundled regular face: a stroke in the fill colour, painted under the fill
 * (Satori emits paint-order: stroke), thickens every stem by ~4% of the font size — visually close
 * to a true 700 weight. Never put a `fontFamily` key here: Satori splits that value unguarded, so an
 * undefined family crashes the whole render.
 */
function boldStyle(fontSize: number, color: string) {
  return {
    fontWeight: 700,
    color,
    WebkitTextStrokeWidth: Math.round(fontSize * 0.4) / 10,
    WebkitTextStrokeColor: color,
  } as const;
}

function siteHost(): string {
  try {
    return new URL(SITE.url).host;
  } catch {
    return SITE.url.replace(/^https?:\/\//, "");
  }
}

export function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    title: sp.get("title") ?? "",
    category: sp.get("category") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid query",
        issues: parsed.error.issues.map((i) => ({ path: i.path.map(String).join("."), message: i.message })),
      },
      { status: 400 },
    );
  }

  const { title, category } = parsed.data;
  const categoryName = category ? categoryBySlug(category)?.name : undefined;
  const fontSize = titleFontSize(title);
  const host = siteHost();

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          backgroundColor: BLUE_600,
          padding: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            backgroundColor: WHITE,
            borderRadius: 24,
            padding: 48,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 56,
                height: 56,
                borderRadius: 14,
                backgroundColor: BLUE_600,
                fontSize: 36,
                ...boldStyle(36, WHITE),
              }}
            >
              T
            </div>
            <div style={{ marginLeft: 16, fontSize: 32, ...boldStyle(32, ZINC_900) }}>{SITE.name}</div>
          </div>

          {/* overflow:hidden is the backstop in case the clamp ever misses; the clamp should always win. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: 1,
              marginTop: 24,
              marginBottom: 24,
              overflow: "hidden",
            }}
          >
            {categoryName ? (
              <div
                style={{
                  fontSize: 22,
                  letterSpacing: 2,
                  color: BLUE_700,
                  marginBottom: 16,
                }}
              >
                {categoryName.toUpperCase()}
              </div>
            ) : null}
            {/* display:block is required for Satori to honour lineClamp; single text child, so it is allowed. */}
            <div
              style={{
                display: "block",
                fontSize,
                lineHeight: 1.15,
                lineClamp: TITLE_MAX_LINES,
                ...boldStyle(fontSize, ZINC_900),
              }}
            >
              {title}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 22,
              color: ZINC_600,
            }}
          >
            <div>Windows 11 fixes, tested the same day</div>
            <div style={{ color: BLUE_600 }}>{host}</div>
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    },
  );
}
