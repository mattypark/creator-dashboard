/**
 * Remediation layer for vision-extraction output.
 *
 * Model JSON (Claude vision or Gemini-transcribe -> Claude-normalize) is
 * untrusted: numbers arrive as "42.9K" strings, percentages exceed 100,
 * demographics hallucinate, arrays come back ragged. remediateAnalytics()
 * takes the raw parsed JSON and returns a guaranteed-clean ExtractedAnalytics
 * — every number finite and non-negative, every percentage clamped, every
 * corrupt set dropped — so nothing downstream ever stores garbage.
 *
 * Pure module, zero imports: also consumed directly by tests/remediate.test.mjs.
 */

export interface ExtractedPost {
  title: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  posted_at: string | null; // ISO date if visible
}

export interface ExtractedAnalytics {
  platform: string | null;
  followers: number | null;
  following: number | null;
  views: number | null;
  engagement: number | null; // percent, e.g. 8.4
  profile_visits: number | null;
  reach: number | null;
  gender: { label: string; pct: number }[];
  age: { label: string; pct: number }[];
  geo: { label: string; pct: number }[];
  active_hours: number[]; // exactly 24 values or []
  top_posts: ExtractedPost[];
}

const MAX_TITLE_LEN = 200;
const HOURS_IN_DAY = 24;
// Demographic sets that add up to more than this are treated as corrupt.
const MAX_DEMOGRAPHIC_SUM = 120;

// "42.9K" / "1,204" / "3.2M" / "8.4%" / "$1.2B" — one optional magnitude
// suffix, optional %; anything else (negatives included) fails to parse.
const NUMERIC_STRING = /^\$?([0-9][0-9,]*(?:\.[0-9]+)?)\s*([kmb])?\s*%?$/i;
const MULTIPLIERS: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };

/**
 * Parse a metric value the model might emit (number or numeric-ish string)
 * into a plain non-negative finite number. Negatives, NaN, Infinity, and
 * unparseable strings all reject to null.
 */
export function parseMetricValue(v: unknown): number | null {
  if (typeof v === "number") {
    return Number.isFinite(v) && v >= 0 ? v : null;
  }
  if (typeof v !== "string") return null;
  const m = NUMERIC_STRING.exec(v.trim());
  if (!m) return null;
  const base = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(base)) return null;
  const mult = m[2] ? MULTIPLIERS[m[2].toLowerCase()] : 1;
  const n = base * mult;
  return Number.isFinite(n) ? n : null;
}

/** Counts (followers, views, likes, ...) are whole numbers. */
function toCount(v: unknown): number | null {
  const n = parseMetricValue(v);
  return n == null ? null : Math.round(n);
}

/** Percentages clamp to 0-100 (negatives already rejected to null). */
function toPercent(v: unknown): number | null {
  const n = parseMetricValue(v);
  return n == null ? null : Math.min(100, n);
}

function toIsoDate(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

// --- Fuzzy title identity (single source of truth — the ingest route and ---
// --- batch dedupe below must agree on what counts as "the same post"). ----

/** Lowercase, strip punctuation/whitespace runs — the canonical title key. */
export function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Case-insensitive fuzzy match: exact or containment after normalization.
 * "step #1" matches "Step #1 — the hook that works" so a screenshot
 * enriches an existing post instead of duplicating it.
 */
export function titlesMatch(a: string, b: string): boolean {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

// --- Section remediators ---------------------------------------------------

function remediateBars(v: unknown): { label: string; pct: number }[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: { label: string; pct: number }[] = [];
  for (const entry of v) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const label = typeof e.label === "string" ? e.label.trim() : "";
    if (!label) continue;
    const pct = parseMetricValue(e.pct);
    if (pct == null || pct > 100) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue; // dedupe, keep first
    seen.add(key);
    out.push({ label, pct });
  }
  const sum = out.reduce((acc, b) => acc + b.pct, 0);
  return sum > MAX_DEMOGRAPHIC_SUM ? [] : out; // over-full set = corrupt
}

function remediateActiveHours(v: unknown): number[] {
  if (!Array.isArray(v) || v.length === 0) return [];
  const parsed: number[] = [];
  for (const entry of v) {
    // Numbers clamp negatives to 0; numeric strings parse; anything else
    // means the whole array is corrupt.
    const n =
      typeof entry === "number" && Number.isFinite(entry)
        ? Math.max(0, entry)
        : parseMetricValue(entry);
    if (n == null) return [];
    parsed.push(n);
  }
  if (parsed.length >= HOURS_IN_DAY) return parsed.slice(0, HOURS_IN_DAY);
  return [...parsed, ...new Array<number>(HOURS_IN_DAY - parsed.length).fill(0)];
}

function remediatePosts(v: unknown): ExtractedPost[] {
  if (!Array.isArray(v)) return [];
  const out: ExtractedPost[] = [];
  for (const entry of v) {
    if (typeof entry !== "object" || entry === null) continue;
    const p = entry as Record<string, unknown>;
    if (typeof p.title !== "string") continue;
    const title = p.title.trim().slice(0, MAX_TITLE_LEN);
    if (!title) continue;
    // Same fuzzy identity the route uses against the DB — dedupe the batch.
    if (out.some((q) => titlesMatch(q.title, title))) continue;
    out.push({
      title,
      views: toCount(p.views),
      likes: toCount(p.likes),
      comments: toCount(p.comments),
      shares: toCount(p.shares),
      saves: toCount(p.saves),
      posted_at: toIsoDate(p.posted_at),
    });
  }
  return out;
}

function emptyAnalytics(): ExtractedAnalytics {
  return {
    platform: null,
    followers: null,
    following: null,
    views: null,
    engagement: null,
    profile_visits: null,
    reach: null,
    gender: [],
    age: [],
    geo: [],
    active_hours: [],
    top_posts: [],
  };
}

/**
 * Coerce raw parsed model JSON into a guaranteed-clean ExtractedAnalytics.
 * Never throws; garbage in (null, arrays, primitives, {}) yields the safe
 * empty shape. platform passes through untouched — the ingest route owns
 * platform normalization.
 */
export function remediateAnalytics(raw: unknown): ExtractedAnalytics {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return emptyAnalytics();
  }
  const o = raw as Record<string, unknown>;
  return {
    platform: typeof o.platform === "string" ? o.platform : null,
    followers: toCount(o.followers),
    following: toCount(o.following),
    views: toCount(o.views),
    engagement: toPercent(o.engagement),
    profile_visits: toCount(o.profile_visits),
    reach: toCount(o.reach),
    gender: remediateBars(o.gender),
    age: remediateBars(o.age),
    geo: remediateBars(o.geo),
    active_hours: remediateActiveHours(o.active_hours),
    top_posts: remediatePosts(o.top_posts),
  };
}
