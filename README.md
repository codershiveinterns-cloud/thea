# Thea

SEO-first blog covering Windows updates (what changed, what broke, how to fix it) and error-code fixes for the newest Windows builds. See [CLAUDE.md](./CLAUDE.md) for the product spec, content rules and build order.

**Current stage: local only.** No hosting, no cloud DB, no auth. `/admin` is open on localhost.

## Stack

- Next.js 15 (App Router, TypeScript, Tailwind v4)
- Prisma 6 on SQLite for local dev (schema is Postgres-compatible; go-live switches `DATABASE_URL`)
- Zod for every external input
- Anthropic API for generation (phase 3)

## Run locally

```bash
npm install            # also runs `prisma generate`
cp .env.example .env   # defaults work as-is for local dev
npm run db:push        # create prisma/dev.db from the schema
npm run db:seed        # 5 categories, 3 authors, 5 keywords, 3 sample posts
npm run dev            # http://localhost:3000  (admin at /admin)
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm run db:push` | Sync `prisma/schema.prisma` to the SQLite file |
| `npm run db:seed` | Idempotent seed (`prisma/seed.ts`) |
| `npm run db:reset` | Drop, recreate and reseed the local DB |
| `npm run db:studio` | Prisma Studio |
| `npm run generate` | Run the content pipeline once. Flags: `-- --dry-run`, `-- --limit 1`, `-- --skip-ingest`, `-- --keyword "phrase" --category error-codes`, `-- --list-refresh` |
| `npm run scheduler` | Local daily scheduler (node-cron, 09:00 local; `-- --now` runs today's batch immediately) |
| `npm test` | Vitest: feed parser, identifier extraction, generated-post validator, quality-gate decision, selection |

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | `file:./dev.db` locally. Postgres connection string at go-live. |
| `NEXT_PUBLIC_SITE_URL` | yes | Canonical origin, no trailing slash. Used by sitemap, JSON-LD, OG images, IndexNow. |
| `AI_PROVIDER` | for generation | `anthropic` or `gemini`. Defaults to whichever key is set. |
| `AI_MODEL` | no | Model id for that provider (defaults `claude-opus-5` / `gemini-3.6-flash`). |
| `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | for generation | Never commit or log them; `src/lib/ai.ts` redacts them from every error. Without a key, ingest still runs and generation stops with a clear error. |
| `SCHEDULER_CRON` | no | Cron expression for `npm run scheduler` (default `0 9 * * *`). |
| `CRON_SECRET` | go-live | Protects `/api/cron/generate`. |

Runtime settings that an editor changes (posts per day, auto-publish, ad slot HTML, IndexNow key, GA4 id, Search Console tag) live in the `Setting` table and are edited at `/admin/settings`, not in env.

## Project layout

```
prisma/               schema.prisma, seed.ts, dev.db (gitignored)
public/uploads/       editor uploads (gitignored) — abstracted behind src/lib/storage.ts
public/avatars/       seeded author avatars
src/app/              routes (public site + /admin)
src/components/ui     buttons, badges, fields, cards
src/components/admin  admin-only components
src/lib/              db, constants, validation (Zod), storage, settings, indexing, dates
src/lib/admin/        every admin server action ("use server")
src/pipeline/         content pipeline (phase 3)
```

## Data model

`Author`, `Category`, `Post`, `Keyword`, `Setting` — see [prisma/schema.prisma](./prisma/schema.prisma). JSON-array fields (`categoryFocus`, `affectedBuilds`, `faq`, `screenshots`, `sourceUrls`) use the `Json` type so the same schema works on SQLite and Postgres. `Post.relatedPosts` is a self many-to-many used for editor-confirmed internal links.

## Editorial workflow

`DRAFT → REVIEW → APPROVED → PUBLISHED → ARCHIVED` (see `src/lib/post-status.ts`). Publishing runs `validateForPublish`: it requires the quick answer, a "Method 1:" H2, an "If nothing worked" section, meta title/description, at least 3 FAQ items and a featured image or screenshot. Missing screenshots and an empty "Tested on" build are warnings, not blockers, so a post can go live with a generated featured image and be verified afterwards.

## Public site

| Route | Notes |
| --- | --- |
| `/` | Home: latest posts, "Recent Windows updates" strip, one section per category |
| `/[category]`, `/[category]/page/[n]` | Category listing, 12 per page, ISR |
| `/[category]/[slug]` | Post page with the full CLAUDE.md structure and Article + FAQPage + BreadcrumbList + Person JSON-LD |
| `/author/[slug]` | Author profile + posts, Person JSON-LD |
| `/about`, `/contact`, `/editorial-policy` | Static pages |
| `/search?q=` | Title/quick-answer search (noindex) |
| `/sitemap.xml`, `/robots.txt`, `/feed.xml` | Generated from published posts |
| `/api/og?title=&category=` | 1200×630 branded OG image (also the fallback featured image) |

Only `PUBLISHED` posts are ever rendered publicly. Pages are statically generated and revalidated hourly, and the admin calls `revalidatePath("/", "layout")` on every publish/unpublish so changes show up immediately. Ad HTML from Settings renders in three slots on the post page (after the quick answer, before the last method, before the FAQ) and only when the slot is non-empty.

### Lighthouse

```bash
npm run build && npm start
npx lighthouse http://localhost:3000/error-codes/fix-0x800f0922-windows-11 --view
```

## Content pipeline (`src/pipeline`)

One run = CLAUDE.md steps 1–9:

1. **Ingest** — fetch the RSS/Atom feeds from Settings → Feeds (default: the Windows Insider blog), validate with Zod, keep items from the last 14 days, derive keywords (KB, build, version, error code, feature) and queue new ones (max 20 per run, deduped by phrase). Identifiers are only ever copied from feed text.
2. **Select** — `POSTS_PER_DAY` queued keywords, newest first, never more than two per category per day.
3. **Assign** — random author whose `categoryFocus` matches, avoiding the previous post's author.
4. **Research** — fetch up to 5 source pages (KB article → feed link → official references), extract text. No sources → no post.
5. **Generate** — one Anthropic call with a schema-constrained JSON output, then strict validation (Method H2s, "If nothing worked", 3–5 FAQ, meta lengths, no HTML).
6. **Quality gate** — deterministic identifier check against the sources + a second scoring call (0–100).
7. **Internal links** — suggestions matched to published posts by category and title similarity.
8. **Featured image** — the branded `/api/og` card for the title.
9. **Publish decision** — `AUTO_PUBLISH` off → `REVIEW`. On → `PUBLISHED` unless an identifier is unsupported by the sources or the score is below Setting `MIN_QUALITY_SCORE` (default 0), then revalidate + IndexNow.

Entry points: `npm run generate`, `npm run scheduler`, the dashboard's "Run pipeline now", and `POST /api/cron/generate` (Bearer `CRON_SECRET`; open on localhost when the secret is unset). The last run's report is shown on the dashboard. The editor's "Regenerate section" button rewrites one H2 from the post's stored source URLs.

## Operations

See [LAUNCH.md](./LAUNCH.md) for the go-live checklist, cron setup, how to add an author, how to review a post, and what to do when a feed source changes. Errors render through `error.tsx` boundaries (site and admin); logs are JSON lines in production (`LOG_LEVEL`); the dashboard keeps the last 20 pipeline runs with their errors.

## Build order

1. ✅ Scaffold + Prisma (SQLite) + seed + `/admin`
2. ✅ Public site + SEO + OG images + Lighthouse ≥ 95
3. ✅ Pipeline + `npm run generate` + scheduler + quality gate + tests
4. ✅ Polish: error boundaries, structured logging, sanitisation, security headers, run history, LAUNCH.md
5. Go-live (Vercel, Postgres, IndexNow, cron)
