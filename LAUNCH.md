# Thea — launch checklist and runbook

## Environment variables

| Variable | Where | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Vercel + local | Supabase pooled connection (pgbouncer, port 6543, `?pgbouncer=true`). Used by the app at runtime. |
| `DIRECT_URL` | Vercel + local | Supabase direct connection (port 5432). Used by `prisma migrate deploy`. |
| `INDEXNOW_KEY` | Vercel | Must equal the filename of `public/<key>.txt`. |
| `NEXT_PUBLIC_SITE_URL` | Vercel + local | Canonical origin, no trailing slash. Drives canonicals, sitemap, OG images, JSON-LD, IndexNow. |
| `AI_PROVIDER` | Vercel + local | `anthropic` or `gemini`. |
| `AI_MODEL` | optional | Model id for the provider (defaults `claude-opus-5` / `gemini-3.6-flash`). |
| `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | Vercel + local | Never committed, never logged (every error message is scrubbed). |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Vercel | HTTP Basic Auth for `/admin` and `/api/admin`. Required in production (503 without them); optional locally. |
| `CRON_SECRET` | Vercel + local | Required everywhere: `/api/cron/generate` returns 503 when unset and 401 without `Authorization: Bearer <CRON_SECRET>`. |
| `LOG_LEVEL` | optional | `debug` \| `info` \| `warn` \| `error` (default `info` in production). Logs are one JSON line per event. |
| `SCHEDULER_CRON` | local only | Cron expression for `npm run scheduler` (default `0 9 * * *`). |

Runtime settings live in the `Setting` table and are edited at `/admin/settings`: posts per day, auto-publish, scheduler on/off, feed URLs, ad slot HTML, IndexNow key, GA4 id, Search Console tag.

## Cron schedule

Local: `npm run scheduler` (node-cron, 09:00 local; first post immediately, the rest 2–3 h apart).

Vercel: `vercel.json` runs `/api/cron/generate` daily at **03:30 UTC** (`30 3 * * *`). Vercel sends `Authorization: Bearer $CRON_SECRET` automatically when `CRON_SECRET` is set on the project. Each run creates up to `POSTS_PER_DAY` posts; to spread them through the day add more cron entries (Pro plan; Hobby allows one daily cron).

## Go-live steps (CLAUDE.md phase 5)

1. Done: Prisma runs on Supabase Postgres (`prisma/migrations/*_init` applied), categories and authors seeded (`npm run db:seed:minimal`). Future schema changes: edit the schema, `npx prisma migrate dev --name <change>` locally, and Vercel runs `npm run db:migrate` in the build step (add it to the Build Command: `npm run db:migrate && npm run build`).
2. Deploy to Vercel with the variables above; connect `thea.global` and `www.thea.global` (www redirects to the apex in `next.config.ts`). Confirm `/robots.txt`, `/sitemap.xml`, `/feed.xml` and one post render.
3. In `/admin/settings`: paste the Search Console verification content (renders as `<meta name="google-site-verification">`) and the GA4 measurement id. The IndexNow key is env `INDEXNOW_KEY` and is served from `public/<key>.txt` (already in the repo).
4. Submit `/sitemap.xml` in Search Console.
5. Write the three real author bios in `/admin/authors` (the seed bios are placeholders and say so publicly).
6. Add feed URLs for the Windows 11 update-history hub and release-health page if Microsoft moves them (defaults are in `src/pipeline/sources/feeds.ts`).
7. Leave `AUTO_PUBLISH` off until a few days of runs have been reviewed by hand. When you turn it on, every post that passes the identifier check is published; set `MIN_QUALITY_SCORE` in Settings to hold low-scoring posts for review.

## How to add an author

`/admin/authors` → New author. Name, slug (auto), avatar (upload or path), an honest bio (shown publicly), category focus (drives assignment), and a style prompt (injected into the generation system prompt). Authors with no matching focus never get posts.

## How to review a post

1. Dashboard → Review queue (or `/admin/posts?status=REVIEW`). Posts show their quality score; under 85 is marked "needs work".
2. Open the post. Check the quick answer, the numbered methods, the FAQ and the quality notes (unsupported identifiers are listed there).
3. Add real screenshots, set "Tested on" build and the last-verified date.
4. Approve, then Publish. Publishing runs the publish check (structure, meta, FAQ count, a featured image or screenshot), revalidates the public site and pings IndexNow when a key is set.
5. Posts published by the pipeline with `AUTO_PUBLISH` on appear in "Published — verify" until a tested-on build is set; the public page shows "Verified: pending" until then.

## When a feed source changes

Ingest is tolerant: a feed that fails or returns no items is logged as a warning and the run continues. Symptoms of a moved source: "Page had no recognisable update/issue entries" in the run log, or zero new keywords for days.

1. Open the page in a browser and find the new URL (the update-history hub, the release-health status page for the current version, or the Insider RSS).
2. Paste the new URL into `/admin/settings` → Feeds (one per line). RSS/Atom is auto-detected; HTML pages use the scrapers in `src/pipeline/sources/feeds.ts` (`parseHtmlSource`).
3. If Microsoft changed the page markup, adjust `parseHtmlSource` and its tests in `src/pipeline/__tests__/feeds.test.ts`.
4. Run `npm run generate -- --ingest-only` and check the queue at `/admin/keywords`.

## Operations

- Every run is recorded: the last report on the dashboard, the last 20 summaries under "Recent pipeline runs" (with errors), and full logs on stdout as JSON lines.
- `npm run generate -- --dry-run --limit 1` generates without writing anything — use it after changing prompts or feeds.
- Security: `/admin` and `/api/admin` require HTTP Basic Auth (`ADMIN_USER` / `ADMIN_PASSWORD`, constant-time compare, 401 with `WWW-Authenticate`). `/api/cron/generate` uses the `CRON_SECRET` bearer token instead. Server actions are same-origin only (Next.js checks the `Origin` header). Markdown never renders raw HTML and unsafe URL schemes are dropped. Ad slot HTML is injected verbatim — paste only your own ad code. Security headers (`nosniff`, `SAMEORIGIN`, referrer policy, permissions policy) are set in `next.config.ts`.

## Re-verification

Published guides whose last verification is older than 90 days appear on the dashboard under "Due for re-verification" (also listed weekly by `npm run scheduler`, Monday 10:00, and by `npm run generate -- --list-refresh`). "Refresh" regenerates the body, quick answer, FAQ and affected builds from fresh sources, stores a new quality score and moves the post to Review; title, slug, meta and screenshots are kept.

## Not implemented yet (from CLAUDE.md)

- Supabase Storage adapter (`src/lib/storage.ts` is local disk; the interface is ready).
- IndexNow key file at `/{key}.txt` (serve from `public/` at go-live) — the ping itself is wired.
- macOS / iOS / Android categories and email subscribe (deferred).
