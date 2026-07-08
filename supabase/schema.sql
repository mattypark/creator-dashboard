-- Creator Dashboard schema. Run in Supabase SQL editor.
-- Single-user tool: RLS not required (service-role key only, server-side).

create table if not exists scripts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default 'Untitled',
  body        text not null default '',
  status      text not null default 'idea'
              check (status in ('idea','script','ready','scheduled','posted')),
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists post_variants (
  id            uuid primary key default gen_random_uuid(),
  script_id     uuid not null references scripts(id) on delete cascade,
  platform      text not null check (platform in ('x','linkedin','instagram','tiktok')),
  body          text not null default '',
  media_ref     text,
  status        text not null default 'draft'
                check (status in ('draft','ready','scheduled','posting','posted','failed')),
  scheduled_at  timestamptz,
  posted_at     timestamptz,
  external_id   text,          -- platform post id; presence => already posted (idempotency)
  error         text,
  retry_count   int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists media (
  id          uuid primary key default gen_random_uuid(),
  storage_key text not null,   -- Supabase Storage object key
  public_url  text not null,   -- public URL (needed for Instagram video)
  kind        text not null default 'video' check (kind in ('video','image')),
  created_at  timestamptz not null default now()
);

create table if not exists metrics_snapshots (
  id          uuid primary key default gen_random_uuid(),
  platform    text not null,
  metric_key  text not null,   -- e.g. subscribers, followers, views, impressions
  value       numeric not null,
  captured_at timestamptz not null default now()
);

create index if not exists idx_variants_due
  on post_variants (status, scheduled_at);
create index if not exists idx_metrics_latest
  on metrics_snapshots (platform, metric_key, captured_at desc);

-- Second brain: captured inspiration (links, tweets, videos, articles, notes).
create table if not exists knowledge_items (
  id               uuid primary key default gen_random_uuid(),
  kind             text not null default 'note'
                   check (kind in ('link','tweet','video','article','note')),
  url              text,
  title            text not null default 'Untitled',
  summary          text,
  raw_text         text,
  source_platform  text,          -- x | linkedin | youtube | instagram | tiktok
  author           text,
  image_url        text,          -- oEmbed / OpenGraph thumbnail
  tags             text[] not null default '{}',
  status           text not null default 'inbox'
                   check (status in ('inbox','processed','archived','promoted')),
  linked_script_id uuid references scripts(id) on delete set null,
  embedding        jsonb,         -- reserved for a later semantic-search upgrade
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_knowledge_status
  on knowledge_items (status, updated_at desc);

-- AI-derived relations between captured items.
create table if not exists knowledge_edges (
  id          uuid primary key default gen_random_uuid(),
  source_id   uuid not null references knowledge_items(id) on delete cascade,
  target_id   uuid not null references knowledge_items(id) on delete cascade,
  reason      text not null default '',
  created_at  timestamptz not null default now(),
  unique (source_id, target_id)
);

-- Proactive suggestions from the agent pass.
create table if not exists agent_suggestions (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null default 'idea'
                  check (kind in ('idea','connection','resurface')),
  title           text not null default '',
  body            text not null default '',
  source_item_ids uuid[] not null default '{}',
  status          text not null default 'new'
                  check (status in ('new','accepted','dismissed')),
  created_at      timestamptz not null default now()
);

create index if not exists idx_suggestions_new
  on agent_suggestions (status, created_at desc);

-- Per-post metrics (each video / post / link the creator tracks).
create table if not exists posts (
  id               uuid primary key default gen_random_uuid(),
  platform         text not null check (platform in ('x','linkedin','youtube','instagram','tiktok')),
  url              text,
  title            text not null default 'Untitled',
  image_url        text,
  posted_at        timestamptz,
  views            numeric not null default 0,
  likes            numeric not null default 0,
  comments         numeric not null default 0,
  shares           numeric not null default 0,
  saves            numeric not null default 0,
  stats_updated_at timestamptz,
  created_at       timestamptz not null default now()
);

-- Safe upgrades if the table was created before these columns existed.
alter table posts add column if not exists image_url text;
alter table posts add column if not exists stats_updated_at timestamptz;

create index if not exists idx_posts_platform
  on posts (platform, posted_at desc);

-- Audience analytics: one row per platform (or 'overall'). Demographic
-- breakdowns + 24-hour activity distribution, upserted on the platform key.
create table if not exists audience_profiles (
  platform      text primary key,   -- x|youtube|linkedin|instagram|tiktok|overall
  gender        jsonb not null default '[]',
  age           jsonb not null default '[]',
  geo           jsonb not null default '[]',
  active_hours  jsonb not null default '[]',
  updated_at    timestamptz not null default now()
);

-- metrics_snapshots already keeps history (every insert appends a row with
-- captured_at); the trend graph reads it via captured_at ordering.
