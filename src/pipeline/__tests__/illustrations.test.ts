import { describe, expect, it } from "vitest";
import {
  captionFor,
  DEFAULT_SCREEN,
  detectScreenForText,
  generateIllustrationsForPost,
  planIllustrations,
  renderScreenSvg,
  SCREENS,
  type ScreenId,
} from "@/lib/illustrations";
import { storage } from "@/lib/storage";

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

describe("generateIllustrationsForPost (integration: real rasterisation + storage)", () => {
  it("stores a featured PNG and splices captioned inline images into the body, cleaning up after itself", async () => {
    const body = ["Intro.", "", "## Method 1: Run the troubleshooter", "Open Settings > System > Troubleshoot and run it.", "", "## If nothing worked", "Contact support."].join("\n");
    const result = await generateIllustrationsForPost({ title: "Test illustration generation", body, slug: `illustration-test-${Date.now()}` });
    try {
      expect(result.featuredImage).toMatch(/^\/uploads\/illustrations\/.*\.png$/);
      expect(result.body).toContain("Illustration:");
      expect(result.body).not.toContain("Screenshot");
      expect(result.body.indexOf("## Method 1")).toBeLessThan(result.body.indexOf("![Illustration:"));
      // the inline image must land inside Method 1, before the "If nothing worked" section
      expect(result.body.indexOf("![Illustration:")).toBeLessThan(result.body.indexOf("## If nothing worked"));
    } finally {
      await storage.remove(result.featuredImage);
      const inlineUrls = [...result.body.matchAll(/!\[Illustration:[^\]]*\]\((\/uploads\/illustrations\/[^)]+)\)/g)].map((m) => m[1]);
      await Promise.all(inlineUrls.map((u) => storage.remove(u)));
    }
  });
});
