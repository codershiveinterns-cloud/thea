# Project: Thea — Windows update & error-fix blog

## What this is
A dynamic, SEO-first blog that publishes same-day coverage of Windows updates
(what changed, what broke, how to fix it) plus error-code fixes for the newest
Windows builds. Goal: organic traffic from Google Search + Google Discover.
Monetised later via self-managed display ad slots (no affiliate networks, no buy buttons).

## Current stage: LOCAL ONLY
- Everything can run on localhost; production is Supabase Postgres + Vercel (see Go-live).
- /admin and /api/admin are behind HTTP Basic Auth (src/middleware.ts): ADMIN_USER +
  ADMIN_PASSWORD from env. Unset in development = open on localhost; unset elsewhere = 503.
  Keep all admin routes under /admin and all admin server actions in src/lib/admin/.
- Screenshots and featured images are saved to /public/uploads/ for now.
  Abstract file storage behind src/lib/storage.ts so it can be swapped for
  Supabase Storage later.
- The daily pipeline runs via `npm run generate`, the "Run pipeline now" button in
  /admin, and a local scheduler (`npm run scheduler` — node-cron, runs daily at
  09:00 local time, splitting POSTS_PER_DAY posts a few hours apart so they look natural).
  When deployed, the same job moves to Vercel Cron hitting /api/cron/generate.

## Go-live (phase 5, after local build works)
- Deploy to Vercel, switch DATABASE_URL to Postgres (Supabase), connect the domain.
- Expose /api/cron/generate protected by CRON_SECRET; add vercel.json cron schedule.
- Add Google Search Console verification meta tag and GA4 ID from Settings.
- Wire the IndexNow key (Setting INDEXNOW_KEY) and serve /{key}.txt at the root.
- Submit /sitemap.xml in Search Console; ping sitemap on every publish.

## Stack (do not change without asking)
- Next.js 15 App Router, TypeScript, Tailwind
- SQLite via Prisma for local dev (schema must stay Postgres-compatible —
  no SQLite-only types; we will switch DATABASE_URL to Postgres/Supabase later)
- AI generation: Anthropic API, key in .env as ANTHROPIC_API_KEY,
  model name in ANTHROPIC_MODEL. Never hardcode keys.
- Images: next/image; OG images via @vercel/og at /api/og

## Content categories (slugs are fixed — used in URLs, sitemap, and pipeline)
1. windows-updates   — "What's new in KBxxxxxxx / Windows 11 25H2" (release coverage)
2. update-problems   — "KBxxxxxxx not installing / stuck / breaks X" (post-update issues)
3. error-codes       — "How to fix 0x800f0922 in Windows 11" (error-code fixes)
4. app-not-working   — "Outlook not opening after Windows update" (third-party app breakage)
5. how-to            — "How to enable/disable [new feature] in Windows 11" (feature guides)

Later (do NOT build yet): macos, ios, android.

## Post structure (every post, enforced by the pipeline and the editor template)
- H1 = target keyword phrased naturally, sentence case (also the meta title)
- "Quick answer" box (2–3 sentences) at the top
- Affected versions / builds (structured field, shown as a badge)
- Body H2s depend on the category (src/lib/post-structure.ts):
  - windows-updates: Highlights (≥5 specific changes from the KB article's Improvements
    section) · Known issues (from the KB article) · Should you install it? · How to get it
  - update-problems / error-codes / app-not-working: "Method 1: …", "Method 2: …", "Method 3: …"
    (≥3, numbered steps) · "If nothing worked"
  - how-to: Steps (numbered) · What it changes · Undo
- "Sources" line above the FAQ linking the Microsoft page(s) the post was generated from
- FAQ (3–5 Q&As, also emitted as FAQPage schema)
- Last-verified date + author + "Tested on: [build]" line
- Internal links to 3–5 related posts (auto-suggested, editor confirms)

## Authors
3–4 author profiles stored in DB: name, slug, avatar, bio, categoryFocus,
stylePrompt (used at generation time). Bios are honest — no fake credentials.
Posts are assigned round-robin among authors whose categoryFocus matches.

## Data model (Prisma)
- Author: id, name, slug, avatar, bio, categoryFocus (json array), stylePrompt, createdAt
- Category: id, name, slug, description
- Post: id, title, slug, categoryId, authorId,
  status (DRAFT | REVIEW | APPROVED | PUBLISHED | ARCHIVED),
  quickAnswer, body (markdown), affectedBuilds (json array), faq (json),
  metaTitle, metaDescription, featuredImage, screenshots (json array),
  sourceUrls (json array), qualityScore, qualityNotes,
  generatedBy (AI | HUMAN), testedOnBuild, lastVerifiedAt, publishedAt, createdAt, updatedAt
- Keyword: id, phrase, categoryId, source (FEED | MANUAL), status (QUEUED | USED | SKIPPED), createdAt
- Setting: key, value

## Pipeline (src/pipeline)
0. Backfill (one-time): `npm run backfill -- --months 6` queues every KB from the last N
   months of the Windows 11 update history.
1. Ingest: fetch Microsoft release-health / Windows update history RSS + Windows
   Insider blog RSS. Extract KB numbers, build numbers, error codes, feature names.
   Validate with Zod. Insert new Keyword rows (dedupe by phrase).
   Never fabricate KB numbers, build numbers, or error codes.
2. Select: POSTS_PER_DAY keywords per run (default 2, max 3, in Settings); newest release first.
   Spread across categories — never 3 posts in the same category on one day.
3. Assign author: random pick among authors whose categoryFocus matches (no two consecutive
   posts by the same author).
4. Research: fetch 3–5 source URLs (official docs first), extract plain text,
   store in sourceUrls. The model may only state facts present in these sources.
5. Generate: Anthropic API call. System prompt = post structure above + author.stylePrompt.
   Output strict JSON: {title, slug, quickAnswer, body, affectedBuilds, faq,
   metaTitle, metaDescription, internalLinkSuggestions}. Strip fences, parse, validate.
6. Quality gate: second API call scoring 0–100 (accuracy vs sources, structure,
   thinness, hallucinated identifiers). Store score + notes.
7. Internal links: match suggestions to existing posts by category + title similarity.
8. Featured image: auto-generate a 1200x630 branded image via /api/og with the title.
9. Publish decision (Setting AUTO_PUBLISH, default false):
   - AUTO_PUBLISH=false → status REVIEW; human publishes from /admin.
   - AUTO_PUBLISH=true  → PUBLISHED immediately (publishedAt = now, sitemap updated,
     IndexNow ping) unless the identifier check fails or score < Setting MIN_QUALITY_SCORE
     (default 0 = no floor) → REVIEW. Post shows "Verified: pending" until a human sets testedOnBuild.
   Every auto-published post is listed in the admin "Published today — verify" queue.

## Hard rules
- With AUTO_PUBLISH=false nothing goes live without a human clicking Publish.
- With AUTO_PUBLISH=true anything flagged for hallucinated identifiers is blocked
  regardless of score; MIN_QUALITY_SCORE (Settings) optionally holds low scores for review.
- Auto-published posts always carry a generated featured image; a human adds real
  screenshots and testedOnBuild afterwards from the "verify" queue.
- Never invent identifiers (KB, build, error code) — only ones from the source feed.
- No raw HTML from AI output is rendered; markdown is sanitised.
- Keep Core Web Vitals green: no layout shift, LCP < 2.5s, images sized and lazy-loaded.

## SEO requirements (built in, not bolted on)
- Article + FAQPage + BreadcrumbList + Person (author) JSON-LD on every post
- Auto sitemap.xml (posts, categories, authors), robots.txt, canonical tags, RSS feed
- Meta title/description per post (generated, editable)
- max-image-preview:large; featured image ≥ 1200px wide (Discover)
- Clean URLs: /[category]/[slug], /author/[slug]
- IndexNow ping on publish (src/lib/indexing.ts) — stub it now, wire the key later

## Public pages
/ (home), /[category], /[category]/[slug], /author/[slug], /about, /contact,
/editorial-policy, /search, /feed.xml, /sitemap.xml, /robots.txt

## Admin pages (/admin, HTTP Basic Auth)
Dashboard (counts by status, review queue) · Posts list with filters · Post editor
(markdown + live preview, all structured fields, screenshot upload, related-posts picker,
status buttons, "Regenerate section" per H2) · Authors CRUD · Keywords queue ·
Settings (ad slot HTML per placement, posts-per-run) · "Run pipeline now" button

## Conventions
- src/app for routes, src/components, src/lib (db, ai, seo, storage, indexing, admin), src/pipeline
- Server components by default; client components only for interactivity
- Zod for all external input; never trust feed or AI output without validation
- Unit tests for the parser, validator, and quality gate (Vitest)
- Commit after each phase; keep README updated with env vars and scripts

## Build order (one phase per session)
1. Scaffold + Prisma (SQLite) + seed (5 categories, 3 authors, 5 keywords) + /admin
2. Public site + all SEO + OG images + Lighthouse ≥ 95 on the post page
3. Pipeline + `npm run generate` + `npm run scheduler` + quality gate + AUTO_PUBLISH + tests
4. Polish: error handling/logging, sanitisation, README, list of anything unimplemented
   + weekly re-verification list (published > 90 days) with a "Refresh" action → REVIEW
5. Go-live (see section above) — only when asked

## Deferred (do not build until asked)
Supabase Storage · macOS/iOS/Android categories · email subscribe
