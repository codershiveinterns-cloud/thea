/**
 * Idempotent seed: 5 categories, 3 authors, and — unless SEED_MINIMAL=1 — 5 keywords plus 3 sample
 * posts so the admin has something to edit. Safe to re-run (upserts by slug/phrase).
 * Production: `SEED_MINIMAL=1 npx prisma db seed` seeds categories and authors only.
 *
 * Author bios are honest placeholders — replace them with real bios before launch.
 * Identifiers in sample posts (0x800f0922, 25H2) come from CLAUDE.md, not invented.
 */
import { PrismaClient } from "@prisma/client";
import { CATEGORIES } from "../src/lib/constants";

const db = new PrismaClient();

const AUTHORS = [
  {
    name: "Maya Reyes",
    slug: "maya-reyes",
    avatar: "/avatars/maya-reyes.svg",
    bio: "Maya writes Thea's update coverage. She tracks every Windows 11 cumulative and feature update on the day it ships, installs it on a test PC, and reports what changed and what to watch for. Placeholder bio — replace before launch.",
    categoryFocus: ["windows-updates", "update-problems"],
    stylePrompt:
      "Voice: calm, factual, newsroom-style. Lead with what changed and who it affects. Short paragraphs, plain English, no hype. Name the exact KB and build from the sources. Prefer 'Microsoft says' over speculation. Use a bulleted change list where it helps scanning.",
  },
  {
    name: "Daniel Okafor",
    slug: "daniel-okafor",
    avatar: "/avatars/daniel-okafor.svg",
    bio: "Daniel handles the error-code and app-breakage fixes. He reproduces each problem on a clean install before writing the steps, and orders methods from least to most disruptive. Placeholder bio — replace before launch.",
    categoryFocus: ["error-codes", "app-not-working", "update-problems"],
    stylePrompt:
      "Voice: patient help-desk technician. Explain what the error means in one sentence, then give numbered steps a non-technical reader can follow. Always say where to click and what the screen should show. Order methods from quickest/least risky to most involved. Warn before anything that changes system files.",
  },
  {
    name: "Priya Natarajan",
    slug: "priya-natarajan",
    avatar: "/avatars/priya-natarajan.svg",
    bio: "Priya writes the how-to guides for new and changed Windows 11 features: where a setting moved, how to turn it on or off, and what it does. Placeholder bio — replace before launch.",
    categoryFocus: ["how-to", "windows-updates"],
    stylePrompt:
      "Voice: friendly and direct, like a colleague showing you where a setting lives. Give the Settings path first (Settings > System > ...), then the alternative (Group Policy, Registry, PowerShell) with a caution note. Keep each step to one action. Mention which build introduced the feature.",
  },
];

const KEYWORDS: { phrase: string; category: string }[] = [
  { phrase: "How to fix 0x800f0922 in Windows 11", category: "error-codes" },
  { phrase: "Windows 11 update stuck at 100 percent", category: "update-problems" },
  { phrase: "Outlook not opening after Windows update", category: "app-not-working" },
  { phrase: "What's new in Windows 11 25H2", category: "windows-updates" },
  { phrase: "How to disable Copilot in Windows 11", category: "how-to" },
];

const SAMPLE_BODY = `Error 0x800f0922 usually means Windows Update could not connect to the update servers or the System Reserved partition is too full to stage the update. Work through the methods below in order — each one takes a few minutes.

## Method 1: Run the Windows Update troubleshooter

1. Open **Settings > System > Troubleshoot > Other troubleshooters**.
2. Next to **Windows Update**, click **Run**.
3. Wait for it to finish, then restart your PC and check for updates again.

## Method 2: Repair system files with DISM and SFC

1. Right-click **Start** and choose **Terminal (Admin)**.
2. Run \`DISM /Online /Cleanup-Image /RestoreHealth\` and wait for it to reach 100%.
3. Run \`sfc /scannow\`.
4. Restart and retry the update.

## Method 3: Free space on the System Reserved partition

1. Press **Win + R**, type \`diskmgmt.msc\`, press Enter.
2. Check the size of the **System Reserved** or **EFI** partition. If it has under 15 MB free, the update can't stage its files.
3. Clear old font files or use a partition tool to extend it, then retry.

## If nothing worked

Download the standalone package for this update from the Microsoft Update Catalog and install it manually. If it still fails, run **Reset this PC** with "Keep my files" as a last resort.`;

const SAMPLE_FAQ = [
  { question: "What does error 0x800f0922 mean?", answer: "It is a Windows Update failure code. It usually appears when the installer cannot reach Microsoft's servers or cannot write to the System Reserved partition." },
  { question: "Will I lose files fixing 0x800f0922?", answer: "No. The troubleshooter, DISM and SFC only repair system files. Only the final 'Reset this PC' option touches apps, and it keeps personal files." },
  { question: "Does a VPN cause 0x800f0922?", answer: "It can. If you are connected to a VPN, disconnect it before checking for updates, because some VPNs block the Windows Update endpoints." },
];

async function main() {
  // Categories
  const categoryIds: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const row = await db.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: { slug: c.slug, name: c.name, description: c.description },
    });
    categoryIds[c.slug] = row.id;
  }

  // Authors
  const authorIds: Record<string, string> = {};
  for (const a of AUTHORS) {
    const row = await db.author.upsert({
      where: { slug: a.slug },
      update: { name: a.name, avatar: a.avatar, bio: a.bio, categoryFocus: a.categoryFocus, stylePrompt: a.stylePrompt },
      create: { ...a },
    });
    authorIds[a.slug] = row.id;
  }

  if (process.env.SEED_MINIMAL === "1") {
    console.log("Seed complete (minimal):", { categories: await db.category.count(), authors: await db.author.count() });
    return;
  }

  // Keywords
  for (const k of KEYWORDS) {
    await db.keyword.upsert({
      where: { phrase: k.phrase },
      update: { categoryId: categoryIds[k.category] },
      create: { phrase: k.phrase, categoryId: categoryIds[k.category], source: "MANUAL", status: "QUEUED" },
    });
  }

  // Sample posts (one per workflow stage so the admin filters have something to show)
  const samples = [
    {
      title: "How to fix error 0x800f0922 in Windows 11",
      slug: "fix-0x800f0922-windows-11",
      category: "error-codes",
      author: "daniel-okafor",
      status: "PUBLISHED" as const,
      publishedAt: new Date("2026-09-01T09:00:00Z"),
      testedOnBuild: "Windows 11 25H2",
      lastVerifiedAt: new Date("2026-09-01T09:00:00Z"),
      qualityScore: 91,
      qualityNotes: "Sample post seeded for local development.",
    },
    {
      title: "Windows 11 update stuck at 100 percent: how to finish or cancel it",
      slug: "windows-11-update-stuck-at-100-percent",
      category: "update-problems",
      author: "maya-reyes",
      status: "REVIEW" as const,
      publishedAt: null,
      testedOnBuild: null,
      lastVerifiedAt: null,
      qualityScore: 78,
      qualityNotes: "Sample post seeded for local development. Needs a screenshot of the stuck progress screen.",
    },
    {
      title: "Outlook not opening after a Windows update: 5 fixes that work",
      slug: "outlook-not-opening-after-windows-update",
      category: "app-not-working",
      author: "daniel-okafor",
      status: "DRAFT" as const,
      publishedAt: null,
      testedOnBuild: null,
      lastVerifiedAt: null,
      qualityScore: null,
      qualityNotes: null,
    },
  ];

  const created: string[] = [];
  for (const s of samples) {
    const row = await db.post.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        title: s.title,
        slug: s.slug,
        categoryId: categoryIds[s.category],
        authorId: authorIds[s.author],
        status: s.status,
        quickAnswer:
          "Run the Windows Update troubleshooter first, then repair system files with DISM and SFC. If the update still fails, check that the System Reserved partition has free space and install the update manually from the Update Catalog.",
        body: SAMPLE_BODY,
        affectedBuilds: ["Windows 11 24H2", "Windows 11 25H2"],
        faq: SAMPLE_FAQ,
        metaTitle: s.title.slice(0, 70),
        metaDescription: "Step-by-step fixes, from the built-in troubleshooter to a manual install. Tested on the latest Windows 11 build.",
        featuredImage: null,
        screenshots: [],
        sourceUrls: ["https://support.microsoft.com/windows"],
        generatedBy: "HUMAN",
        qualityScore: s.qualityScore,
        qualityNotes: s.qualityNotes,
        testedOnBuild: s.testedOnBuild,
        lastVerifiedAt: s.lastVerifiedAt,
        publishedAt: s.publishedAt,
      },
    });
    created.push(row.id);
  }
  // Link the sample posts to each other so the related-posts picker has data.
  for (const id of created) {
    await db.post.update({
      where: { id },
      data: { relatedPosts: { set: created.filter((x) => x !== id).map((x) => ({ id: x })) } },
    });
  }

  const counts = {
    categories: await db.category.count(),
    authors: await db.author.count(),
    keywords: await db.keyword.count(),
    posts: await db.post.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
