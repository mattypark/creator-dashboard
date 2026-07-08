import { FEED_ADAPTERS, type FeedItem } from "@/lib/adapters/feeds";
import { getDb } from "@/lib/db";
import type { MetricPlatform } from "@/lib/types";

/** List recent posts across platforms (live pull, not persisted). */
export async function GET() {
  const items = await collect();
  return Response.json({ items });
}

/**
 * Import recent posts into the knowledge base so the brain knows what the
 * creator has shipped. Dedupes by URL. Optional { platform } to scope.
 */
export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json().catch(() => ({}));
  const platform = body.platform as MetricPlatform | undefined;

  const feed = await collect(platform);
  const existing = await db.listKnowledge();
  const seen = new Set(existing.map((k) => k.url).filter(Boolean));

  let imported = 0;
  for (const item of feed) {
    if (seen.has(item.url)) continue;
    await db.createKnowledge({
      kind: item.kind,
      url: item.url,
      title: item.title,
      image_url: item.image_url,
      author: item.author,
      source_platform: item.source_platform,
      status: "inbox",
      tags: ["mine"],
    });
    seen.add(item.url);
    imported++;
  }
  return Response.json({ imported });
}

async function collect(platform?: MetricPlatform): Promise<FeedItem[]> {
  const adapters = platform
    ? [FEED_ADAPTERS[platform]]
    : Object.values(FEED_ADAPTERS);
  const all = await Promise.all(adapters.map((a) => a.fetch()));
  return all.flat();
}
