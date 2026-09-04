# FixDesk

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
| `npm run generate` | Run the content pipeline once (phase 3) |
| `npm run scheduler` | Local daily scheduler, 09:00 local time (phase 3) |

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | `file:./dev.db` locally. Postgres connection string at go-live. |
| `NEXT_PUBLIC_SITE_URL` | yes | Canonical origin, no trailing slash. Used by sitemap, JSON-LD, OG images, IndexNow. |
| `ANTHROPIC_API_KEY` | phase 3 | Never commit it. |
| `ANTHROPIC_MODEL` | phase 3 | Model name used by the pipeline. |
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

## Build order

1. ✅ Scaffold + Prisma (SQLite) + seed + `/admin`
2. ✅ Public site + SEO + OG images + Lighthouse ≥ 95
3. Pipeline + `npm run generate` + scheduler + quality gate + tests
4. Polish, logging, sanitisation
5. Go-live (Vercel, Postgres, IndexNow, cron)
