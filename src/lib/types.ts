export type Platform = "x" | "linkedin" | "instagram" | "tiktok";

// Platforms shown on the dashboard metrics sidebar (includes youtube, read-only).
export type MetricPlatform = Platform | "youtube";

export type ScriptStatus =
  | "idea"
  | "script"
  | "ready"
  | "scheduled"
  | "posted";

export type VariantStatus =
  | "draft"
  | "ready"
  | "scheduled"
  | "posting"
  | "posted"
  | "failed";

export interface Script {
  id: string;
  title: string;
  body: string;
  status: ScriptStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface PostVariant {
  id: string;
  script_id: string;
  platform: Platform;
  body: string;
  media_ref?: string | null;
  status: VariantStatus;
  scheduled_at?: string | null;
  posted_at?: string | null;
  external_id?: string | null;
  error?: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface MetricSnapshot {
  platform: MetricPlatform;
  metric_key: string;
  value: number;
  captured_at: string;
}

// --- Per-post metrics + audience analytics --------------------------------

export interface Post {
  id: string;
  platform: MetricPlatform;
  url?: string | null;
  title: string;
  posted_at?: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  created_at: string;
}

export interface AudienceBar {
  label: string;
  pct: number;
}

// One row per platform (or "overall") holding demographic + time-of-day data.
export interface AudienceProfile {
  platform: MetricPlatform | "overall";
  gender: AudienceBar[];
  age: AudienceBar[];
  geo: AudienceBar[];
  active_hours: number[]; // 24 values (hour 0–23), share of audience activity
  updated_at: string;
}

export const AUDIENCE_PLATFORMS: (MetricPlatform | "overall")[] = [
  "overall",
  "x",
  "youtube",
  "linkedin",
  "instagram",
  "tiktok",
];

// --- Second brain: captured knowledge -------------------------------------

// What kind of thing was captured. Drives the icon + how it's processed.
export type KnowledgeKind = "link" | "tweet" | "video" | "article" | "note";

// Lifecycle of a captured item through the brain.
export type KnowledgeStatus = "inbox" | "processed" | "archived" | "promoted";

export interface KnowledgeItem {
  id: string;
  kind: KnowledgeKind;
  url?: string | null; // null for pure notes / brain dumps
  title: string;
  summary?: string | null; // AI-generated (deferred to enrichment pass)
  raw_text?: string | null; // note body or scraped excerpt
  source_platform?: MetricPlatform | null;
  author?: string | null;
  image_url?: string | null; // oEmbed / OpenGraph thumbnail
  tags: string[];
  status: KnowledgeStatus;
  linked_script_id?: string | null; // set when promoted into the pipeline
  embedding?: number[] | null; // reserved for a later semantic-search upgrade
  created_at: string;
  updated_at: string;
}

export const KNOWLEDGE_KINDS: KnowledgeKind[] = [
  "link",
  "tweet",
  "video",
  "article",
  "note",
];

export const KNOWLEDGE_STATUSES: KnowledgeStatus[] = [
  "inbox",
  "processed",
  "archived",
  "promoted",
];

// AI-derived relation between two captured items (built in the agent pass).
export interface KnowledgeEdge {
  id: string;
  source_id: string;
  target_id: string;
  reason: string;
  created_at: string;
}

// A proactive suggestion the agent surfaces for the creator.
export type SuggestionKind = "idea" | "connection" | "resurface";
export type SuggestionStatus = "new" | "accepted" | "dismissed";

export interface AgentSuggestion {
  id: string;
  kind: SuggestionKind;
  title: string;
  body: string;
  source_item_ids: string[];
  status: SuggestionStatus;
  created_at: string;
}

export const SCRIPT_STATUSES: ScriptStatus[] = [
  "idea",
  "script",
  "ready",
  "scheduled",
  "posted",
];

export const PLATFORM_META: Record<
  MetricPlatform,
  { label: string; autoPost: boolean; color: string }
> = {
  x: { label: "Twitter / X", autoPost: true, color: "#1d9bf0" },
  linkedin: { label: "LinkedIn", autoPost: true, color: "#0a66c2" },
  youtube: { label: "YouTube", autoPost: false, color: "#ff0000" },
  instagram: { label: "Instagram", autoPost: false, color: "#e1306c" },
  tiktok: { label: "TikTok", autoPost: false, color: "#69c9d0" },
};

// Day-one auto-post targets. IG/TikTok are compose+manual until access clears.
export const AUTO_POST_PLATFORMS: Platform[] = ["x", "linkedin"];

// Metric keys that are additive across platforms (safe to sum into "Overall").
// Non-additive keys (views, impressions, watch-time) are shown per-platform only.
export const SUMMABLE_METRIC_KEYS = new Set(["subscribers", "followers"]);
