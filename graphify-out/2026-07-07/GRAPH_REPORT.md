# Graph Report - creator-dashboard  (2026-07-07)

## Corpus Check
- 45 files · ~12,427 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 290 nodes · 526 edges · 19 communities (14 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6b738eb2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_MemoryDb|MemoryDb]]
- [[_COMMUNITY_types.ts|types.ts]]
- [[_COMMUNITY_devDependencies|devDependencies]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_db.ts|db.ts]]
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_Context Creator Dashboard|Context: Creator Dashboard]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]
- [[_COMMUNITY_README|README.md]]
- [[_COMMUNITY_AGENTS|AGENTS.md]]
- [[_COMMUNITY_eslint.config.mjs|eslint.config.mjs]]
- [[_COMMUNITY_next.config.ts|next.config.ts]]
- [[_COMMUNITY_postcss.config.mjs|postcss.config.mjs]]
- [[_COMMUNITY_vercel.json|vercel.json]]
- [[_COMMUNITY_types.ts|types.ts]]
- [[_COMMUNITY_ingest.ts|ingest.ts]]
- [[_COMMUNITY_MetricsSidebar.tsx|MetricsSidebar.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]

## God Nodes (most connected - your core abstractions)
1. `MemoryDb` - 27 edges
2. `getDb()` - 25 edges
3. `Db` - 22 edges
4. `SupabaseDb` - 22 edges
5. `compilerOptions` - 16 edges
6. `Script` - 14 edges
7. `nowIso()` - 13 edges
8. `MetricPlatform` - 13 edges
9. `PostVariant` - 13 edges
10. `KnowledgeItem` - 13 edges

## Surprising Connections (you probably didn't know these)
- `runAgent()` --calls--> `fetchMetadata()`  [EXTRACTED]
  src/app/api/agent/route.ts → src/lib/adapters/ingest.ts
- `runAgent()` --calls--> `getDb()`  [EXTRACTED]
  src/app/api/agent/route.ts → src/lib/db.ts
- `GET()` --calls--> `getDb()`  [EXTRACTED]
  src/app/api/cron/route.ts → src/lib/db.ts
- `POST()` --calls--> `getDb()`  [EXTRACTED]
  src/app/api/feed/route.ts → src/lib/db.ts
- `GET()` --calls--> `getDb()`  [EXTRACTED]
  src/app/api/knowledge/route.ts → src/lib/db.ts

## Import Cycles
- None detected.

## Communities (19 total, 5 thin omitted)

### Community 0 - "MemoryDb"
Cohesion: 0.05
Nodes (12): PublishAdapter, Db, MemoryDb, nowIso(), SupabaseDb, uid(), AgentSuggestion, KnowledgeEdge (+4 more)

### Community 1 - "types.ts"
Cohesion: 0.17
Nodes (8): collect(), GET(), POST(), METRICS_ADAPTERS, MetricsAdapter, youtubeAdapter, MetricSnapshot, SUMMABLE_METRIC_KEYS

### Community 2 - "devDependencies"
Cohesion: 0.08
Nodes (23): dependencies, @anthropic-ai/sdk, next, react, react-dom, @supabase/supabase-js, devDependencies, eslint (+15 more)

### Community 3 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 4 - "db.ts"
Cohesion: 0.15
Nodes (17): GET(), DELETE(), GET(), PATCH(), POST(), POST(), DELETE(), GET() (+9 more)

### Community 5 - "route.ts"
Cohesion: 0.23
Nodes (15): GET(), POST(), runAgent(), POST(), AINotConfiguredError, client(), complete(), completeJson() (+7 more)

### Community 6 - "Context: Creator Dashboard"
Cohesion: 0.20
Nodes (9): Architecture, Assignment / next steps, Context: Creator Dashboard, Go live — fill `.env.local` (copy from `.env.example`), Real blockers (verify at build time, do NOT hardcode), Run it, Source design doc, What we're building (+1 more)

### Community 7 - "layout.tsx"
Cohesion: 0.29
Nodes (5): geistMono, geistSans, metadata, LINKS, TopNav()

### Community 8 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 15 - "types.ts"
Cohesion: 0.09
Nodes (22): MetricsSidebar(), ALL_PLATFORMS, Composer(), Props, KanbanBoard(), Props, Props, QuickCapture() (+14 more)

### Community 16 - "ingest.ts"
Cohesion: 0.16
Nodes (19): collect(), GET(), POST(), FEED_ADAPTERS, FeedAdapter, FeedItem, youtubeAdapter, classify() (+11 more)

### Community 17 - "MetricsSidebar.tsx"
Cohesion: 0.22
Nodes (9): HubPlatformCard(), Props, MetricCard(), Props, MetricGroup, Props, OverallCard(), Props (+1 more)

### Community 18 - "page.tsx"
Cohesion: 0.19
Nodes (8): BrainCapture(), Props, KIND_ICON, KnowledgeCard(), Props, safeUrl(), Props, SuggestionsPanel()

## Knowledge Gaps
- **80 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+75 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MemoryDb` connect `MemoryDb` to `types.ts`, `db.ts`, `types.ts`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `SupabaseDb` connect `MemoryDb` to `types.ts`, `db.ts`, `types.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `getDb()` connect `db.ts` to `ingest.ts`, `types.ts`, `route.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _80 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `MemoryDb` be split into smaller, more focused modules?**
  _Cohesion score 0.05427547363031234 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._