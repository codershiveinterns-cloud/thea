import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  captionFor,
  DEFAULT_SCREEN,
  detectScreenForText,
  generateIllustrationsForPost,
  illustrationUrl,
  planIllustrations,
  renderScreenSvg,
  SCREENS,
  stripIllustrations,
  type ScreenId,
} from "@/lib/illustrations";

describe("detectScreenForText", () => {
  it("matches the more specific screen before the generic Windows Update fallback", () => {
    expect(detectScreenForText("Open Settings > Windows Update > Advanced options > Optional updates")).toBe("optional-updates");
    expect(detectScreenForText("Check your update history to see what installed")).toBe("update-history");
    expect(detectScreenForText("Run the Windows Update troubleshooter")).toBe("troubleshoot");
    expect(detectScreenForText("Use Reset this PC from the Recovery page")).toBe("recovery");
    expect(detectScreenForText("Open Windows Security and check virus & threat protection")).toBe("windows-security");
    expect(detectScreenForText("Go to Installed apps and uninstall the app")).toBe("apps-installed");
    expect(detectScreenForText("Check your OS build on the About page")).toBe("about");
    expect(detectScreenForText("Turn off the Copilot icon on the taskbar")).toBe("personalization-taskbar");
    expect(detectScreenForText("Click Check for updates in Windows Update")).toBe("windows-update");
  });
  it("returns null for text with no Settings-screen signal", () => {
    expect(detectScreenForText("Outlook keeps crashing when you open an attachment")).toBeNull();
  });
  it("does not fire the taskbar screen on an incidental mention (regression: sound-icon-in-the-taskbar fixes)", () => {
    expect(detectScreenForText("Click the Sound icon located on the right side of your taskbar next to the clock.")).not.toBe("personalization-taskbar");
  });
});

describe("planIllustrations", () => {
  it("picks the screen each Method section actually references, in document order, capped at 2", () => {
    const body = [
      "Intro paragraph about the problem.",
      "",
      "## Method 1: Run the troubleshooter",
      "Open Settings > System > Troubleshoot > Other troubleshooters and run the Windows Update troubleshooter.",
      "",
      "## Method 2: Check optional updates",
      "Go to Windows Update > Advanced options > Optional updates and install any driver updates.",
      "",
      "## Method 3: Reset the PC",
      "As a last resort, use Reset this PC from the Recovery page.",
      "",
      "## If nothing worked",
      "Contact support.",
    ].join("\n");
    const plan = planIllustrations({ title: "Fix a Windows Update problem", body });
    expect(plan.inline).toHaveLength(2);
    expect(plan.inline[0]).toMatchObject({ screenId: "troubleshoot", sectionIndex: 0, highlight: 0 });
    expect(plan.inline[1]).toMatchObject({ screenId: "optional-updates", sectionIndex: 1, highlight: 1 });
    expect(plan.featured.screenId).toBe("troubleshoot");
  });

  it("falls back to the overall-detected screen anchored at the first instructional heading when no section names one", () => {
    const body = ["Intro.", "", "## Method 1: Do the thing", "Some generic steps with no Settings screen mentioned.", "", "## If nothing worked", "Try again later."].join("\n");
    const plan = planIllustrations({ title: "How to fix error 0x80070057 Windows Update", body });
    expect(plan.inline).toHaveLength(1);
    expect(plan.inline[0].sectionIndex).toBe(0);
    expect(plan.inline[0].screenId).toBe("windows-update");
    expect(plan.featured.screenId).toBe("windows-update");
  });

  it("falls back to the default screen when even the title gives no signal, and never picks an inline slot with no instructional heading", () => {
    const body = "Just a paragraph with no headings at all.";
    const plan = planIllustrations({ title: "A completely generic title", body });
    expect(plan.inline).toEqual([]);
    expect(plan.featured.screenId).toBe(DEFAULT_SCREEN);
  });

  it("recognises the how-to and release structures' instructional headings (Steps / How to get it)", () => {
    const howto = ["Intro.", "", "## Steps", "Open Settings > Personalization > Taskbar and turn off Copilot.", "", "## What it changes", "x", "", "## Undo", "y"].join("\n");
    expect(planIllustrations({ title: "How to disable Copilot", body: howto }).inline[0].screenId).toBe("personalization-taskbar");

    const release = ["Intro.", "", "## Highlights", "- a fix", "", "## Known issues", "none", "", "## Should you install it?", "yes", "", "## How to get it", "Check for updates in Windows Update."].join("\n");
    expect(planIllustrations({ title: "What's new in KB123456", body: release }).inline[0].screenId).toBe("windows-update");
  });
});

describe("renderScreenSvg / captionFor", () => {
  it("renders a well-formed SVG document for every catalogued screen", () => {
    for (const id of Object.keys(SCREENS) as ScreenId[]) {
      const svg = renderScreenSvg(id);
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).toContain("</svg>");
      expect(svg).toContain(SCREENS[id].pageTitle);
    }
  });
  it("varies which row is highlighted by the highlight index", () => {
    const a = renderScreenSvg("windows-update", 0);
    const b = renderScreenSvg("windows-update", 1);
    expect(a).not.toBe(b);
  });
  it("every caption starts with 'Illustration:' and never says 'Screenshot'", () => {
    for (const id of Object.keys(SCREENS) as ScreenId[]) {
      const caption = captionFor(id);
      expect(caption.startsWith("Illustration:")).toBe(true);
      expect(caption.toLowerCase()).not.toContain("screenshot");
    }
  });
});

describe("generateIllustrationsForPost (pure — no filesystem, no storage)", () => {
  it("builds an /api/illustration URL for the featured image and splices captioned inline images into the body", () => {
    const body = ["Intro.", "", "## Method 1: Run the troubleshooter", "Open Settings > System > Troubleshoot and run it.", "", "## If nothing worked", "Contact support."].join("\n");
    const result = generateIllustrationsForPost({ title: "Test illustration generation", body });
    expect(result.featuredImage).toMatch(/^\/api\/illustration\?screen=troubleshoot&highlight=0&w=1200&h=630$/);
    expect(result.body).toContain("Illustration:");
    expect(result.body).not.toContain("Screenshot");
    expect(result.body).not.toContain("/uploads/illustrations/");
    expect(result.body.indexOf("## Method 1")).toBeLessThan(result.body.indexOf("![Illustration:"));
    // the inline image must land inside Method 1, before the "If nothing worked" section
    expect(result.body.indexOf("![Illustration:")).toBeLessThan(result.body.indexOf("## If nothing worked"));
  });

  it("illustrationUrl is deterministic and carries the screen, highlight and size", () => {
    expect(illustrationUrl("windows-update", 1, 900, 473)).toBe("/api/illustration?screen=windows-update&highlight=1&w=900&h=473");
  });
});

describe("stripIllustrations", () => {
  it("removes a previously-inserted illustration block regardless of which URL scheme it used", () => {
    const withLegacy = [
      "## Method 1: Run the troubleshooter",
      "",
      "![Illustration: the Troubleshoot page](/uploads/illustrations/123-post-inline-0.png)",
      "",
      "*Illustration: the Troubleshoot page*",
      "",
      "Open Settings > System > Troubleshoot and run it.",
    ].join("\n");
    const cleaned = stripIllustrations(withLegacy);
    expect(cleaned).not.toContain("Illustration:");
    expect(cleaned).not.toContain("/uploads/illustrations/");
    expect(cleaned).toContain("Open Settings > System > Troubleshoot and run it.");
  });

  it("is a no-op on a body with no illustration block", () => {
    const body = "## Method 1\n\nJust steps, no image.";
    expect(stripIllustrations(body)).toBe(body);
  });

  it("round-trips: stripping a freshly generated post recovers content re-plannable to the same screens", () => {
    const original = ["Intro.", "", "## Method 1: Run the troubleshooter", "Open Settings > System > Troubleshoot and run it.", "", "## If nothing worked", "Contact support."].join("\n");
    const generated = generateIllustrationsForPost({ title: "x", body: original });
    const stripped = stripIllustrations(generated.body);
    const replanned = generateIllustrationsForPost({ title: "x", body: stripped });
    expect(replanned.featuredImage).toBe(generated.featuredImage);
  });
});

describe("/api/illustration rendering (the same rasterisation the route handler performs)", () => {
  it("produces a valid PNG of the requested dimensions for every catalogued screen", async () => {
    for (const id of Object.keys(SCREENS) as ScreenId[]) {
      const svg = renderScreenSvg(id, 0);
      const png = await sharp(Buffer.from(svg)).resize(300, 158).png().toBuffer();
      const meta = await sharp(png).metadata();
      expect(meta.format).toBe("png");
      expect(meta.width).toBe(300);
      expect(meta.height).toBe(158);
    }
  });
});
