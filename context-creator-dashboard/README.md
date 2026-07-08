# Context: Creator Dashboard

Single-source context for what this project is, why it's built this way, and where it's going. Read this first.

---

## What we're building

A **personal, single-user content operating system**. One dashboard to run the whole pipeline:

1. **Capture** a raw thought → AI turns it into a script or content ideas.
2. **Plan / write** scripts in a Notion-style pipeline board.
3. **Repurpose** one source script into per-platform captions (X, LinkedIn, Instagram, TikTok) with AI.
4. **Publish** to X + LinkedIn automatically; IG/TikTok composed now, auto-posted later.
5. **Monitor** — left-sidebar metric cards per platform (Twitter, TikTok, YouTube, Instagram) plus an Overall rollup (total subscribers, etc.).

Built for one person (Matthew), owned and customizable. NOT a SaaS, NOT bought off-the-shelf (Buffer/Hootsuite/Publer/vidIQ rejected on purpose).

---

## Why these decisions

| Decision | Reason |
|---|---|
| Single-user, tokens in env | Skips per-user OAuth + Meta/TikTok app review — the thing that kills most clones. |
| Workspace is the heart, posting is the last 10% | Planning value doesn't need posting access. IG/TikTok ideas work before their APIs do. |
| Auto-post = X + LinkedIn day one | Both are text-friendly and solo-doable. IG/TikTok deferred behind their review gates. |
| Thin Anthropic API layer | Not a vidIQ analytics clone — just script drafts, hooks, repurposing, ideas. |
| Hosted on Vercel + Anthropic API key | Always-on (scheduling fires), cheap at solo volume. No way to call Claude Code/Codex sub credits as a hosted API. |
| Adapter pattern (publish + metrics) | Adding a new platform = one module, not a rewrite. |

---

## Architecture

```
src/lib/
  types.ts            Platform/status enums, PLATFORM_META, summable-metric whitelist
  db.ts               Db interface + SupabaseDb (env set) / MemoryDb (demo, zero-config)
  ai.ts               Anthropic: draftScript, repurpose, ideasFromThought
  adapters/
    publish.ts        PublishAdapter per platform (X/LinkedIn live, IG/TikTok manual stubs)
    metrics.ts        MetricsAdapter per platform (YouTube live, rest connect-later stubs)
src/app/
  page.tsx            Dashboard: metrics sidebar + kanban board + quick capture + composer drawer
  api/
    scripts/route.ts  CRUD
    ai/route.ts        draft / ideas / repurpose
    publish/route.ts   create-then-publish a variant (idempotent on external_id)
    metrics/route.ts   read + refresh snapshots, overall rollup
    cron/route.ts      Vercel Cron dispatcher for scheduled posts (retry up to 3)
supabase/schema.sql   scripts, post_variants, media, metrics_snapshots
vercel.json           cron every 5 min (needs Vercel Pro for minute-level)
```

**Content lifecycle:** `idea → script → ready → scheduled → posted` (scripts), `draft → ready → scheduled → posting → posted | failed` (variants).

**Demo mode:** with no Supabase env, data lives in memory (resets on restart) so the app runs with zero config. Banner in the UI shows which mode is active.

---

## Run it

```bash
npm run dev          # localhost:3000, works immediately in demo mode
npm run build        # production build (passes clean)
```

### Go live — fill `.env.local` (copy from `.env.example`)
- `ANTHROPIC_API_KEY` — turns on all AI
- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — persist data (run `supabase/schema.sql` first)
- `YOUTUBE_API_KEY` + `YOUTUBE_CHANNEL_ID` — YouTube metrics
- `X_BEARER_TOKEN` (+ keys) — X auto-post
- `LINKEDIN_ACCESS_TOKEN` + `LINKEDIN_AUTHOR_URN` — LinkedIn auto-post
- `CRON_SECRET` — protect the cron endpoint

`.env*` is gitignored. Never commit real keys.

---

## Real blockers (verify at build time, do NOT hardcode)

- **X**: Free tier is write-limited (~500/mo) with little read access; useful metrics likely need Basic (~$100/mo).
- **LinkedIn**: posting needs an approved app + `w_member_social` product — not granted automatically.
- **Instagram/TikTok/Meta**: need business/creator accounts + `content_publish` review; video needs a public URL.
- **Token expiry**: LinkedIn ~60 days, YouTube needs an OAuth refresh-token flow. Plan refresh/rotation per platform.

---

## Assignment / next steps

1. **Today:** start the X, LinkedIn, and Google Cloud (YouTube Data API) developer-app approvals. Longest lead time, gates everything.
2. Wire Supabase + Anthropic key, see live data.
3. Build scheduling UI on top of the existing cron + `scheduled_at` fields.
4. Fill the IG/TikTok publish stubs once their access clears (one function each).

---

## Source design doc

Full office-hours design + adversarial review:
`~/.gstack/projects/matthewpark/matthewpark-unknown-design-20260606-115625.md`

Run `/plan-eng-review` on it to lock architecture before going deeper.
