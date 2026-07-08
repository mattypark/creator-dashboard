import { fetchPostStats, platformFromUrl } from "@/lib/adapters/poststats";
import { getDb } from "@/lib/db";
import type { MetricPlatform } from "@/lib/types";

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

  // Auto-enrich from the public post page when a URL is given.
  let enriched = {};
  if (typeof body.url === "string" && body.url.trim()) {
    const stats = await fetchPostStats(platform, body.url.trim());
    if (stats) {
      enriched = {
        title: body.title || stats.title,
        image_url: stats.image_url,
        posted_at: stats.posted_at,
        views: stats.views ?? body.views,
        likes: stats.likes ?? body.likes,
        comments: stats.comments ?? body.comments,
        shares: stats.shares ?? body.shares,
        stats_updated_at: new Date().toISOString(),
      };
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
