import { fetchPostStats, platformFromUrl } from "@/lib/adapters/poststats";
import { getDb } from "@/lib/db";
import { PLATFORM_META, type MetricPlatform } from "@/lib/types";

/**
 * Readable fallback title from a post URL, for platforms that block scraping
 * (Instagram/LinkedIn wall off datacenter IPs): "Instagram post DIabc123".
 */
function titleFromUrl(platform: MetricPlatform, url: string): string {
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    // Last meaningful segment, skipping generic path words.
    const skip = new Set(["p", "reel", "reels", "posts", "video", "status", "watch", "shorts"]);
    const slug = [...segments].reverse().find((s) => !skip.has(s.toLowerCase()));
    const label = PLATFORM_META[platform].label.split(" ")[0];
    return slug ? `${label} post ${slug.slice(0, 24)}` : `${label} post`;
  } catch {
    return "Untitled";
  }
}

export async function GET(request: Request) {
  const db = getDb();
  const platform = new URL(request.url).searchParams.get("platform") as
    | MetricPlatform
    | null;
  const posts = await db.listPosts(platform ?? undefined);
  return Response.json({ mode: db.mode, posts });
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json().catch(() => ({}));

  // Platform can be inferred from a pasted URL.
  const platform: MetricPlatform | null =
    body.platform ?? (body.url ? platformFromUrl(body.url) : null);
  if (!platform)
    return Response.json({ error: "platform required" }, { status: 400 });

  // Auto-enrich from the public post page when a URL is given. When the
  // scrape comes back empty (IG/LinkedIn block server IPs), fall back to a
  // readable URL-derived title so the card is never a bare "Untitled".
  let enriched: Record<string, unknown> = {};
  if (typeof body.url === "string" && body.url.trim()) {
    const url = body.url.trim();
    const stats = await fetchPostStats(platform, url);
    if (stats) {
      enriched = {
        title: body.title || stats.title || titleFromUrl(platform, url),
        image_url: stats.image_url,
        posted_at: stats.posted_at,
        views: stats.views ?? body.views,
        likes: stats.likes ?? body.likes,
        comments: stats.comments ?? body.comments,
        shares: stats.shares ?? body.shares,
        stats_updated_at: new Date().toISOString(),
      };
    } else if (!body.title) {
      enriched = { title: titleFromUrl(platform, url) };
    }
  }

  const post = await db.createPost({ ...body, platform, ...enriched });
  return Response.json({ post }, { status: 201 });
}

export async function PATCH(request: Request) {
  const db = getDb();
  const { id, ...patch } = await request.json();
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const post = await db.updatePost(id, patch);
  if (!post) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ post });
}

export async function DELETE(request: Request) {
  const db = getDb();
  const { id } = await request.json();
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  await db.deletePost(id);
  return Response.json({ ok: true });
}
