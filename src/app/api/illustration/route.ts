/**
 * /api/illustration?screen=<ScreenId>&highlight=<int>&w=<int>&h=<int>
 * On-demand Windows 11 Settings-screen illustration, rendered from the hand-built SVG templates
 * in src/lib/illustrations and rasterised to PNG with sharp.
 *
 * This mirrors /api/og deliberately: nothing is written to disk anywhere (posts store this URL,
 * not a file path), so there is nothing that needs to be shipped between a script run on a
 * developer's machine and the deployed app — the image is byte-identical wherever it renders,
 * which is also why the one-year immutable cache below is truthful.
 *
 * sharp is a native binary and does not run on the Edge runtime, hence the explicit Node.js runtime.
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { renderScreenSvg, SCREENS, type ScreenId } from "@/lib/illustrations";

export const runtime = "nodejs";

const SCREEN_IDS = Object.keys(SCREENS) as [ScreenId, ...ScreenId[]];

const querySchema = z.object({
  screen: z.enum(SCREEN_IDS),
  highlight: z.coerce.number().int().min(0).max(10).default(0),
  w: z.coerce.number().int().min(200).max(1600).default(1200),
  h: z.coerce.number().int().min(120).max(1000).default(630),
});

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    screen: sp.get("screen") ?? undefined,
    highlight: sp.get("highlight") ?? undefined,
    w: sp.get("w") ?? undefined,
    h: sp.get("h") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid query", issues: parsed.error.issues.map((i) => ({ path: i.path.map(String).join("."), message: i.message })) },
      { status: 400 },
    );
  }

  const { screen, highlight, w, h } = parsed.data;
  const svg = renderScreenSvg(screen, highlight);

  const sharp = (await import("sharp")).default;
  const png = await sharp(Buffer.from(svg)).resize(w, h).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
