import { describe, expect, it } from "vitest";
import { sentenceCase, structureFor, validateBodyStructure } from "@/lib/post-structure";
import { extractKbSections, isKbArticleUrl } from "../research";

const release = `Intro paragraph.

## Highlights

- Change one to File Explorer
- Change two to the taskbar
- Change three to Settings
- Change four to Bluetooth
- Change five to Task Manager

## Known issues

- Some devices might fail to open File Explorer — Microsoft is investigating.

## Should you install it?

Optional preview; wait if you rely on X.

## How to get it

1. Settings > Windows Update > Check for updates.
2. Or the Microsoft Update Catalog.`;

const howto = `Intro.

## Steps

1. Open Settings.
2. Go to Personalization > Taskbar.
3. Turn the toggle off.

## What it changes

The icon disappears.

## Undo

1. Turn the toggle back on.`;

const fix = `Intro.\n\n## Method 1: A\n\n1. x\n\n## Method 2: B\n\n1. y\n\n## Method 3: C\n\n1. z\n\n## If nothing worked\n\nText.`;

describe("structureFor", () => {
  it("maps categories to structure kinds", () => {
    expect(structureFor("windows-updates")).toBe("release");
    expect(structureFor("how-to")).toBe("howto");
    for (const c of ["update-problems", "error-codes", "app-not-working"]) expect(structureFor(c)).toBe("fix");
  });
});

describe("validateBodyStructure", () => {
  it("accepts well-formed bodies of each kind", () => {
    expect(validateBodyStructure(release, "release")).toEqual([]);
    expect(validateBodyStructure(howto, "howto")).toEqual([]);
    expect(validateBodyStructure(fix, "fix")).toEqual([]);
  });
  it("requires at least 5 highlights and every release section", () => {
    const four = release.replace("- Change five to Task Manager\n", "");
    expect(validateBodyStructure(four, "release")).toContain('"## Highlights" needs at least 5 specific changes as list items.');
    expect(validateBodyStructure(release.replace("## Known issues", "## Issues"), "release")).toContain('Missing "## Known issues".');
    expect(validateBodyStructure(release.replace("## How to get it", "## Get it"), "release")).toContain('Missing "## How to get it".');
  });
  it("requires numbered steps, what it changes and undo for how-to", () => {
    expect(validateBodyStructure(howto.replace("## Undo", "## Reverting"), "howto")).toContain('Missing "## Undo".');
    expect(validateBodyStructure(howto.replace("1. Open Settings.\n2. Go to Personalization > Taskbar.\n3. Turn the toggle off.", "Just do it."), "howto")).toContain('"## Steps" needs a numbered list of at least two steps.');
  });
  it("requires three methods and If nothing worked for fixes, and no H1 anywhere", () => {
    expect(validateBodyStructure(fix.replace("## Method 3: C\n\n1. z\n\n", ""), "fix")).toContain('Only 2 "Method N:" sections (need 3+).');
    expect(validateBodyStructure("# Title\n" + fix, "fix")).toContain("Body contains an H1 (the title is the H1).");
    expect(validateBodyStructure(release, "fix").length).toBeGreaterThan(0);
  });
});

describe("sentenceCase", () => {
  it("lower-cases Title Case words but keeps proper nouns, acronyms and identifiers", () => {
    expect(sentenceCase("How To Fix Error 0x800f0922 In Windows 11")).toBe("How to fix error 0x800f0922 in Windows 11");
    expect(sentenceCase("KB5120998 Windows 11 Build 26200.9278 Preview Update Details")).toBe("KB5120998 Windows 11 build 26200.9278 preview update details");
    expect(sentenceCase("What's New In KB5120998 For Windows 11 25H2")).toBe("What's new in KB5120998 for Windows 11 25H2");
    expect(sentenceCase("Fix Windows Update Stuck At 100 Percent")).toBe("Fix Windows Update stuck at 100 percent");
  });
  it("leaves sentence-case titles alone", () => {
    expect(sentenceCase("Outlook not opening after a Windows update: 5 fixes that work")).toBe("Outlook not opening after a Windows update: 5 fixes that work");
    expect(sentenceCase("how to disable Copilot in Windows 11")).toBe("How to disable Copilot in Windows 11");
  });
});

describe("extractKbSections", () => {
  const text = `August 27, 2026—KB5120998 (OS Builds 26200.9278 and 26100.9278) Preview
Applies to: Windows 11
Improvements
This non-security update includes quality improvements.
[File Explorer] Fixed: context menu opens slowly.
[Taskbar] New: pin apps from search.
Known issues in this update
Symptom: Some devices might fail to open File Explorer.
Workaround: Restart explorer.exe.
How to get this update
Before installing this update...`;
  it("splits Improvements and Known issues at the article's headings", () => {
    const { improvements, knownIssues } = extractKbSections(text);
    expect(improvements).toContain("[File Explorer] Fixed: context menu opens slowly.");
    expect(improvements).not.toContain("Symptom");
    expect(knownIssues).toContain("Workaround: Restart explorer.exe.");
    expect(knownIssues).not.toContain("Before installing");
  });
  it("returns null when a section is absent", () => {
    expect(extractKbSections("Improvements\nOne small fix line that is long enough.\nHow to get this update\nx").knownIssues).toBeNull();
    expect(extractKbSections("nothing here").improvements).toBeNull();
  });
  it("recognises KB article URLs", () => {
    expect(isKbArticleUrl("https://support.microsoft.com/help/5120998")).toBe(true);
    expect(isKbArticleUrl("https://support.microsoft.com/en-us/topic/august-27-2026-kb5120998-preview-abc")).toBe(true);
    expect(isKbArticleUrl("https://learn.microsoft.com/windows/release-health/")).toBe(false);
  });
});
