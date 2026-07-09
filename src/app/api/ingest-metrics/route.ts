import { AINotConfiguredError, extractAnalytics } from "@/lib/ai";
import type { ExtractedPost } from "@/lib/ai";
import { titlesMatch } from "@/lib/extract-remediate";
import { getDb } from "@/lib/db";
import type { MetricPlatform, Post } from "@/lib/types";

const VALID: MetricPlatform[] = ["x", "youtube", "linkedin", "instagram", "tiktok"];

function normalizePlatform(raw: string | null | undefined): MetricPlatform | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes("twitter") || s === "x") return "x";
  if (s.includes("tube")) return "youtube";
  if (s.includes("linked")) return "linkedin";
  if (s.includes("insta")) return "instagram";
  if (s.includes("tik")) return "tiktok";
  return VALID.includes(s as MetricPlatform) ? (s as MetricPlatform) : null;
}

// Extraction output arrives pre-cleaned: extractAnalytics() runs every field
// through remediateAnalytics() (src/lib/extract-remediate.ts), so numbers are
// finite/non-negative, dates are ISO-or-null, and titles are non-empty. The
// old local num()/isoDate()/title helpers were exact duplicates of that layer
// and were removed so the rules can't drift — titlesMatch is imported from
// the same module the batch dedupe uses (single source of truth).

// Only fields the extraction actually returned (null = keep existing value).
function postPatch(p: ExtractedPost): Partial<Post> {
  const patch: Partial<Post> = {};
  if (p.views != null) patch.views = p.views;
  if (p.likes != null) patch.likes = p.likes;
  if (p.comments != null) patch.comments = p.comments;
  if (p.shares != null) patch.shares = p.shares;
  if (p.saves != null) patch.saves = p.saves;
  if (p.posted_at != null) patch.posted_at = p.posted_at;
  return patch;
}

/**
 * Upload an analytics screenshot -> vision extraction -> structured metrics.
 * Optional Gemini transcription pre-pass when GEMINI_API_KEY is set (falls
 * back silently to Claude-only). Extracted posts merge into existing rows via
 * fuzzy title match instead of duplicating.
 * Body: { imageBase64, mediaType, platform? }. Degrades keyless (503 needsKey).
 */
export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json().catch(() => ({}));
  if (!body.imageBase64)
    return Response.json({ error: "imageBase64 required" }, { status: 400 });

  try {
    const { data, usedGemini } = await extractAnalytics(
      body.imageBase64,
      body.mediaType || "image/png",
    );
    const platform =
      normalizePlatform(data.platform) || normalizePlatform(body.platform);
    if (!platform)
      return Response.json(
        { error: "could not determine platform — pick one and retry" },
        { status: 422 },
      );

    const wrote: string[] = [];

    // Platform-level snapshot metrics (only keys the extraction returned).
    const metricValues: Record<string, number | null> = {
      followers: data.followers,
      following: data.following,
      views: data.views,
      engagement: data.engagement,
      profile_visits: data.profile_visits,
      reach: data.reach,
    };
    for (const [metric_key, value] of Object.entries(metricValues)) {
      if (value == null) continue;
      await db.insertMetric({ platform, metric_key, value });
      wrote.push(metric_key);
    }

    if (
      data.gender?.length ||
      data.age?.length ||
      data.geo?.length ||
      data.active_hours?.length
    ) {
      await db.upsertAudience({
        platform,
        gender: data.gender ?? [],
        age: data.age ?? [],
        geo: data.geo ?? [],
        active_hours: data.active_hours ?? [],
        updated_at: new Date().toISOString(),
      });
      wrote.push("audience");
    }

    // Merge extracted posts into existing rows (fuzzy title match) — only
    // create a new post when nothing on this platform matches.
    let matchedPosts = 0;
    let newPosts = 0;
    const existing = await db.listPosts(platform);
    for (const p of data.top_posts ?? []) {
      const patch = postPatch(p);
      const match = existing.find((e) => titlesMatch(e.title, p.title));
      if (match) {
        if (Object.keys(patch).length) await db.updatePost(match.id, patch);
        matchedPosts++;
      } else {
        const created = await db.createPost({ platform, title: p.title, ...patch });
        existing.push(created); // dedupe repeats within the same screenshot
        newPosts++;
      }
    }
    if (matchedPosts + newPosts > 0)
      wrote.push(`${matchedPosts + newPosts} posts`);

    return Response.json({
      ok: true,
      platform,
      wrote,
      matchedPosts,
      newPosts,
      usedGemini,
    });
  } catch (e) {
    if (e instanceof AINotConfiguredError)
      return Response.json({ error: e.message, needsKey: true }, { status: 503 });
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
