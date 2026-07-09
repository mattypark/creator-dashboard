# Deploy

Production deploys are automatic: **push to `main`** on
[github.com/mattypark/creator-dashboard](https://github.com/mattypark/creator-dashboard)
and Vercel builds + deploys production. There is no manual deploy step.

## Before you push

```bash
npm run verify
```

Runs `lint` → `build` → `test:e2e` (the same gate CI runs). The e2e suite
spawns its own production server on port 3038 in keyless demo mode, so no
env vars or running dev server are needed locally.

GitHub Actions (`.github/workflows/ci.yml`) runs the same three steps on
every push and PR to `main`.

## Vercel environment variables

The app runs keyless in demo mode, so nothing is strictly required to boot —
but production needs these set in the Vercel project settings:

| Variable | Purpose |
|---|---|
| `APP_PASSWORD` | Login gate for the dashboard |
| `ANTHROPIC_API_KEY` | AI features (agent, summaries, ideas) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server-side access |
| `CRON_SECRET` | Authorizes Vercel cron requests to the cron routes |

Optional:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_MODEL` | Override the default Claude model |
| `GEMINI_API_KEY` | Gemini-backed features |
| `YOUTUBE_API_KEY` | YouTube Data API metrics |
| `YOUTUBE_CHANNEL_ID` | Which channel to pull metrics for |

## Cron jobs (`vercel.json`)

| Path | Schedule | What it does |
|---|---|---|
| `/api/cron` | `*/5 * * * *` (every 5 min) | Publishes due scheduled posts |
| `/api/agent` | `0 13 * * *` (daily 13:00 UTC) | Proactive AI brain pass (backfill, summaries, ideas) |
| `/api/refresh-posts` | `0 14 */2 * *` (14:00 UTC every 2nd day) | Re-fetches stats for tracked posts |

All three routes check `Authorization: Bearer $CRON_SECRET` when
`CRON_SECRET` is set. Vercel sends that header automatically for crons.

## Database schema changes

Supabase is not migrated automatically. After changing the schema,
**re-run `supabase/schema.sql`** against the Supabase project (SQL editor
or `psql`) before or alongside the deploy that depends on it.
