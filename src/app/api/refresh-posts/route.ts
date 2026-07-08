import { fetchPostStats } from "@/lib/adapters/poststats";
import { getDb } from "@/lib/db";
import type { Post } from "@/lib/types";

const MAX_PER_RUN = 30; // stay well inside function time limits

/**
 * Re-fetch stats for every tracked post that has a URL. Oldest-refreshed
 * first so all posts cycle through even if a run hits the cap. Scrapes are
 * best-effort: a failed fetch just leaves the post unchanged.
 *
 * GET  — scheduled trigger (CRON_SECRET when set).
 * POST — manual "Refresh stats" from the UI.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`)
      return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return refresh();
}

export async function POST() {
  return refresh();
}

async function refresh() {
  const db = getDb();
  const posts = (await db.listPosts()).filter((p) => p.url);
  posts.sort(
    (a, b) => (a.stats_updated_at ?? "").localeCompare(b.stats_updated_at ?? ""),
  );
  const batch = posts.slice(0, MAX_PER_RUN);

  let updated = 0;
  const failures: string[] = [];
  for (const post of batch) {
    const stats = await fetchPostStats(post.platform, post.url!);
    if (!stats) {
      failures.push(post.title);
      continue;
    }
    const patch: Partial<Post> = { stats_updated_at: new Date().toISOString() };
    if (stats.views != null) patch.views = stats.views;
    if (stats.likes != null) patch.likes = stats.likes;
    if (stats.comments != null) patch.comments = stats.comments;
    if (stats.shares != null) patch.shares = stats.shares;
    if (stats.image_url && !post.image_url) patch.image_url = stats.image_url;
    if (stats.posted_at && !post.posted_at) patch.posted_at = stats.posted_at;
    await db.updatePost(post.id, patch);
    updated++;
  }

  return Response.json({
    checked: batch.length,
    updated,
    skippedNoData: failures.length,
    failures: failures.slice(0, 10),
  });
}
