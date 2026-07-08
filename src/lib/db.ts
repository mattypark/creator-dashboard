import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  AgentSuggestion,
  AudienceProfile,
  KnowledgeEdge,
  KnowledgeItem,
  KnowledgeStatus,
  MetricPlatform,
  MetricSnapshot,
  Post,
  PostVariant,
  Script,
  SuggestionStatus,
} from "./types";

/**
 * Data layer with two backends:
 *  - SupabaseDb when NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
 *  - MemoryDb otherwise ("demo mode") so the app runs with zero config.
 *
 * The Db interface is what every API route talks to, so swapping backends
 * never touches callers.
 */
export interface Db {
  readonly mode: "supabase" | "memory";
  listScripts(): Promise<Script[]>;
  createScript(input: Partial<Script>): Promise<Script>;
  updateScript(id: string, patch: Partial<Script>): Promise<Script | null>;
  deleteScript(id: string): Promise<void>;

  listVariants(scriptId?: string): Promise<PostVariant[]>;
  createVariant(input: Partial<PostVariant>): Promise<PostVariant>;
  updateVariant(
    id: string,
    patch: Partial<PostVariant>,
  ): Promise<PostVariant | null>;
  listDueVariants(now: string): Promise<PostVariant[]>;

  listLatestMetrics(): Promise<MetricSnapshot[]>;
  listMetricHistory(platform: MetricPlatform, metricKey: string): Promise<MetricSnapshot[]>;
  insertMetric(m: Omit<MetricSnapshot, "captured_at">): Promise<void>;

  listPosts(platform?: MetricPlatform): Promise<Post[]>;
  createPost(input: Partial<Post>): Promise<Post>;
  updatePost(id: string, patch: Partial<Post>): Promise<Post | null>;
  deletePost(id: string): Promise<void>;

  listAudience(): Promise<AudienceProfile[]>;
  upsertAudience(profile: AudienceProfile): Promise<AudienceProfile>;

  listKnowledge(status?: KnowledgeStatus): Promise<KnowledgeItem[]>;
  createKnowledge(input: Partial<KnowledgeItem>): Promise<KnowledgeItem>;
  updateKnowledge(
    id: string,
    patch: Partial<KnowledgeItem>,
  ): Promise<KnowledgeItem | null>;
  deleteKnowledge(id: string): Promise<void>;

  listEdges(itemId?: string): Promise<KnowledgeEdge[]>;
  createEdge(input: Partial<KnowledgeEdge>): Promise<KnowledgeEdge>;

  listSuggestions(status?: SuggestionStatus): Promise<AgentSuggestion[]>;
  createSuggestion(input: Partial<AgentSuggestion>): Promise<AgentSuggestion>;
  updateSuggestion(
    id: string,
    patch: Partial<AgentSuggestion>,
  ): Promise<AgentSuggestion | null>;
}

const nowIso = () => new Date().toISOString();
const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `id_${Math.random().toString(36).slice(2)}`;

// ---------------------------------------------------------------------------
// In-memory backend (demo mode). Resets on server restart.
// ---------------------------------------------------------------------------
class MemoryDb implements Db {
  readonly mode = "memory" as const;
  private scripts: Script[] = [];
  private variants: PostVariant[] = [];
  private metrics: MetricSnapshot[] = [];
  private knowledge: KnowledgeItem[] = [];
  private edges: KnowledgeEdge[] = [];
  private suggestions: AgentSuggestion[] = [];
  private posts: Post[] = [];
  private audience: AudienceProfile[] = [];

  async listScripts() {
    return [...this.scripts].sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at),
    );
  }
  async createScript(input: Partial<Script>) {
    const s: Script = {
      id: uid(),
      title: input.title ?? "Untitled",
      body: input.body ?? "",
      status: input.status ?? "idea",
      tags: input.tags ?? [],
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    this.scripts.push(s);
    return s;
  }
  async updateScript(id: string, patch: Partial<Script>) {
    const s = this.scripts.find((x) => x.id === id);
    if (!s) return null;
    Object.assign(s, patch, { updated_at: nowIso() });
    return s;
  }
  async deleteScript(id: string) {
    this.scripts = this.scripts.filter((x) => x.id !== id);
    this.variants = this.variants.filter((v) => v.script_id !== id);
  }

  async listVariants(scriptId?: string) {
    return this.variants.filter((v) => !scriptId || v.script_id === scriptId);
  }
  async createVariant(input: Partial<PostVariant>) {
    const v: PostVariant = {
      id: uid(),
      script_id: input.script_id!,
      platform: input.platform!,
      body: input.body ?? "",
      media_ref: input.media_ref ?? null,
      status: input.status ?? "draft",
      scheduled_at: input.scheduled_at ?? null,
      posted_at: input.posted_at ?? null,
      external_id: input.external_id ?? null,
      error: input.error ?? null,
      retry_count: input.retry_count ?? 0,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    this.variants.push(v);
    return v;
  }
  async updateVariant(id: string, patch: Partial<PostVariant>) {
    const v = this.variants.find((x) => x.id === id);
    if (!v) return null;
    Object.assign(v, patch, { updated_at: nowIso() });
    return v;
  }
  async listDueVariants(now: string) {
    return this.variants.filter(
      (v) =>
        v.status === "scheduled" &&
        v.scheduled_at != null &&
        v.scheduled_at <= now &&
        v.external_id == null,
    );
  }

  async listLatestMetrics() {
    // Keep only the newest row per (platform, metric_key).
    const seen = new Set<string>();
    const out: MetricSnapshot[] = [];
    for (let i = this.metrics.length - 1; i >= 0; i--) {
      const row = this.metrics[i];
      const k = `${row.platform}:${row.metric_key}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(row);
    }
    return out;
  }
  async listMetricHistory(platform: MetricPlatform, metricKey: string) {
    return this.metrics
      .filter((m) => m.platform === platform && m.metric_key === metricKey)
      .sort((a, b) => a.captured_at.localeCompare(b.captured_at));
  }
  async insertMetric(m: Omit<MetricSnapshot, "captured_at">) {
    // Append (keep history) so the trend graph has a time series.
    this.metrics.push({ ...m, captured_at: nowIso() });
  }

  async listKnowledge(status?: KnowledgeStatus) {
    return [...this.knowledge]
      .filter((k) => !status || k.status === status)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }
  async createKnowledge(input: Partial<KnowledgeItem>) {
    const k: KnowledgeItem = {
      id: uid(),
      kind: input.kind ?? "note",
      url: input.url ?? null,
      title: input.title ?? "Untitled",
      summary: input.summary ?? null,
      raw_text: input.raw_text ?? null,
      source_platform: input.source_platform ?? null,
      author: input.author ?? null,
      image_url: input.image_url ?? null,
      tags: input.tags ?? [],
      status: input.status ?? "inbox",
      linked_script_id: input.linked_script_id ?? null,
      embedding: input.embedding ?? null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    this.knowledge.push(k);
    return k;
  }
  async updateKnowledge(id: string, patch: Partial<KnowledgeItem>) {
    const k = this.knowledge.find((x) => x.id === id);
    if (!k) return null;
    Object.assign(k, patch, { updated_at: nowIso() });
    return k;
  }
  async deleteKnowledge(id: string) {
    this.knowledge = this.knowledge.filter((x) => x.id !== id);
    this.edges = this.edges.filter(
      (e) => e.source_id !== id && e.target_id !== id,
    );
  }

  async listEdges(itemId?: string) {
    return this.edges.filter(
      (e) => !itemId || e.source_id === itemId || e.target_id === itemId,
    );
  }
  async createEdge(input: Partial<KnowledgeEdge>) {
    const existing = this.edges.find(
      (e) => e.source_id === input.source_id && e.target_id === input.target_id,
    );
    if (existing) return existing;
    const e: KnowledgeEdge = {
      id: uid(),
      source_id: input.source_id!,
      target_id: input.target_id!,
      reason: input.reason ?? "",
      created_at: nowIso(),
    };
    this.edges.push(e);
    return e;
  }

  async listSuggestions(status?: SuggestionStatus) {
    return [...this.suggestions]
      .filter((s) => !status || s.status === status)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async createSuggestion(input: Partial<AgentSuggestion>) {
    const s: AgentSuggestion = {
      id: uid(),
      kind: input.kind ?? "idea",
      title: input.title ?? "",
      body: input.body ?? "",
      source_item_ids: input.source_item_ids ?? [],
      status: input.status ?? "new",
      created_at: nowIso(),
    };
    this.suggestions.push(s);
    return s;
  }
  async updateSuggestion(id: string, patch: Partial<AgentSuggestion>) {
    const s = this.suggestions.find((x) => x.id === id);
    if (!s) return null;
    Object.assign(s, patch);
    return s;
  }

  async listPosts(platform?: MetricPlatform) {
    return [...this.posts]
      .filter((p) => !platform || p.platform === platform)
      .sort((a, b) =>
        (b.posted_at ?? b.created_at).localeCompare(a.posted_at ?? a.created_at),
      );
  }
  async createPost(input: Partial<Post>) {
    const p: Post = {
      id: uid(),
      platform: input.platform!,
      url: input.url ?? null,
      title: input.title ?? "Untitled",
      posted_at: input.posted_at ?? null,
      views: input.views ?? 0,
      likes: input.likes ?? 0,
      comments: input.comments ?? 0,
      shares: input.shares ?? 0,
      saves: input.saves ?? 0,
      created_at: nowIso(),
    };
    this.posts.push(p);
    return p;
  }
  async updatePost(id: string, patch: Partial<Post>) {
    const p = this.posts.find((x) => x.id === id);
    if (!p) return null;
    Object.assign(p, patch);
    return p;
  }
  async deletePost(id: string) {
    this.posts = this.posts.filter((x) => x.id !== id);
  }

  async listAudience() {
    return [...this.audience];
  }
  async upsertAudience(profile: AudienceProfile) {
    this.audience = this.audience.filter((a) => a.platform !== profile.platform);
    const next = { ...profile, updated_at: nowIso() };
    this.audience.push(next);
    return next;
  }
}

// ---------------------------------------------------------------------------
// Supabase backend.
// ---------------------------------------------------------------------------
class SupabaseDb implements Db {
  readonly mode = "supabase" as const;
  constructor(private sb: SupabaseClient) {}

  async listScripts() {
    const { data, error } = await this.sb
      .from("scripts")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data as Script[];
  }
  async createScript(input: Partial<Script>) {
    const { data, error } = await this.sb
      .from("scripts")
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as Script;
  }
  async updateScript(id: string, patch: Partial<Script>) {
    const { data, error } = await this.sb
      .from("scripts")
      .update({ ...patch, updated_at: nowIso() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Script;
  }
  async deleteScript(id: string) {
    const { error } = await this.sb.from("scripts").delete().eq("id", id);
    if (error) throw error;
  }

  async listVariants(scriptId?: string) {
    let q = this.sb.from("post_variants").select("*");
    if (scriptId) q = q.eq("script_id", scriptId);
    const { data, error } = await q;
    if (error) throw error;
    return data as PostVariant[];
  }
  async createVariant(input: Partial<PostVariant>) {
    const { data, error } = await this.sb
      .from("post_variants")
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as PostVariant;
  }
  async updateVariant(id: string, patch: Partial<PostVariant>) {
    const { data, error } = await this.sb
      .from("post_variants")
      .update({ ...patch, updated_at: nowIso() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as PostVariant;
  }
  async listDueVariants(now: string) {
    const { data, error } = await this.sb
      .from("post_variants")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now)
      .is("external_id", null);
    if (error) throw error;
    return data as PostVariant[];
  }

  async listLatestMetrics() {
    const { data, error } = await this.sb
      .from("metrics_snapshots")
      .select("*")
      .order("captured_at", { ascending: false });
    if (error) throw error;
    // Keep only the newest row per (platform, metric_key).
    const seen = new Set<string>();
    const out: MetricSnapshot[] = [];
    for (const row of (data as MetricSnapshot[]) ?? []) {
      const k = `${row.platform}:${row.metric_key}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(row);
    }
    return out;
  }
  async listMetricHistory(platform: MetricPlatform, metricKey: string) {
    const { data, error } = await this.sb
      .from("metrics_snapshots")
      .select("*")
      .eq("platform", platform)
      .eq("metric_key", metricKey)
      .order("captured_at", { ascending: true });
    if (error) throw error;
    return data as MetricSnapshot[];
  }
  async insertMetric(m: Omit<MetricSnapshot, "captured_at">) {
    const { error } = await this.sb.from("metrics_snapshots").insert(m);
    if (error) throw error;
  }

  async listKnowledge(status?: KnowledgeStatus) {
    let q = this.sb
      .from("knowledge_items")
      .select("*")
      .order("updated_at", { ascending: false });
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    return data as KnowledgeItem[];
  }
  async createKnowledge(input: Partial<KnowledgeItem>) {
    const { data, error } = await this.sb
      .from("knowledge_items")
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as KnowledgeItem;
  }
  async updateKnowledge(id: string, patch: Partial<KnowledgeItem>) {
    const { data, error } = await this.sb
      .from("knowledge_items")
      .update({ ...patch, updated_at: nowIso() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as KnowledgeItem;
  }
  async deleteKnowledge(id: string) {
    const { error } = await this.sb.from("knowledge_items").delete().eq("id", id);
    if (error) throw error;
  }

  async listEdges(itemId?: string) {
    let q = this.sb.from("knowledge_edges").select("*");
    if (itemId) q = q.or(`source_id.eq.${itemId},target_id.eq.${itemId}`);
    const { data, error } = await q;
    if (error) throw error;
    return data as KnowledgeEdge[];
  }
  async createEdge(input: Partial<KnowledgeEdge>) {
    const { data, error } = await this.sb
      .from("knowledge_edges")
      .upsert(input, { onConflict: "source_id,target_id" })
      .select()
      .single();
    if (error) throw error;
    return data as KnowledgeEdge;
  }

  async listSuggestions(status?: SuggestionStatus) {
    let q = this.sb
      .from("agent_suggestions")
      .select("*")
      .order("created_at", { ascending: false });
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    return data as AgentSuggestion[];
  }
  async createSuggestion(input: Partial<AgentSuggestion>) {
    const { data, error } = await this.sb
      .from("agent_suggestions")
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as AgentSuggestion;
  }
  async updateSuggestion(id: string, patch: Partial<AgentSuggestion>) {
    const { data, error } = await this.sb
      .from("agent_suggestions")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as AgentSuggestion;
  }

  async listPosts(platform?: MetricPlatform) {
    let q = this.sb
      .from("posts")
      .select("*")
      .order("posted_at", { ascending: false, nullsFirst: false });
    if (platform) q = q.eq("platform", platform);
    const { data, error } = await q;
    if (error) throw error;
    return data as Post[];
  }
  async createPost(input: Partial<Post>) {
    const { data, error } = await this.sb
      .from("posts")
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as Post;
  }
  async updatePost(id: string, patch: Partial<Post>) {
    const { data, error } = await this.sb
      .from("posts")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Post;
  }
  async deletePost(id: string) {
    const { error } = await this.sb.from("posts").delete().eq("id", id);
    if (error) throw error;
  }

  async listAudience() {
    const { data, error } = await this.sb.from("audience_profiles").select("*");
    if (error) throw error;
    return data as AudienceProfile[];
  }
  async upsertAudience(profile: AudienceProfile) {
    const { data, error } = await this.sb
      .from("audience_profiles")
      .upsert({ ...profile, updated_at: nowIso() }, { onConflict: "platform" })
      .select()
      .single();
    if (error) throw error;
    return data as AudienceProfile;
  }
}

let _db: Db | null = null;
export function getDb(): Db {
  if (_db) return _db;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    _db = new SupabaseDb(createClient(url, key, { auth: { persistSession: false } }));
  } else {
    _db = new MemoryDb();
  }
  return _db;
}
