import { AINotConfiguredError, extractAnalytics } from "@/lib/ai";
import { getDb } from "@/lib/db";
import type { MetricPlatform } from "@/lib/types";

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

/**
 * Upload an analytics screenshot -> Claude vision -> structured metrics stored.
 * Body: { imageBase64, mediaType, platform? }. Degrades keyless (503 needsKey).
 */
export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json().catch(() => ({}));
  if (!body.imageBase64)
    return Response.json({ error: "imageBase64 required" }, { status: 400 });

  try {
    const data = await extractAnalytics(
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
    if (data.followers != null) {
      await db.insertMetric({ platform, metric_key: "followers", value: data.followers });
      wrote.push("followers");
    }
    if (data.views != null) {
      await db.insertMetric({ platform, metric_key: "views", value: data.views });
      wrote.push("views");
    }
    if (data.engagement != null) {
      await db.insertMetric({ platform, metric_key: "engagement", value: data.engagement });
      wrote.push("engagement");
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
    for (const p of data.top_posts ?? []) {
      await db.createPost({ platform, title: p.title, views: p.views });
    }
    if (data.top_posts?.length) wrote.push(`${data.top_posts.length} posts`);

    return Response.json({ ok: true, platform, wrote });
  } catch (e) {
    if (e instanceof AINotConfiguredError)
      return Response.json({ error: e.message, needsKey: true }, { status: 503 });
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
