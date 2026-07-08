import type { KnowledgeKind, MetricPlatform } from "../types";

/**
 * "What have I posted lately" per platform. Mirrors metrics.ts: each adapter
 * returns recent items or [] when not configured. Imported items become
 * KnowledgeItems so the brain also knows the creator's own output.
 */

export interface FeedItem {
  title: string;
  url: string;
  image_url: string | null;
  author: string | null;
  source_platform: MetricPlatform;
  kind: KnowledgeKind;
}

export interface FeedAdapter {
  platform: MetricPlatform;
  fetch(): Promise<FeedItem[]>;
}

// --- YouTube: recent uploads via Data API (existing env) --------------------
const youtubeAdapter: FeedAdapter = {
  platform: "youtube",
  async fetch() {
    const key = process.env.YOUTUBE_API_KEY;
    const channel = process.env.YOUTUBE_CHANNEL_ID;
    if (!key || !channel) return [];
    try {
      const url =
        `https://www.googleapis.com/youtube/v3/search?part=snippet` +
        `&channelId=${channel}&order=date&type=video&maxResults=6&key=${key}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      const items = Array.isArray(json?.items) ? json.items : [];
      return items
        .filter((it: { id?: { videoId?: string } }) => it?.id?.videoId)
        .map((it: {
          id: { videoId: string };
          snippet?: {
            title?: string;
            channelTitle?: string;
            thumbnails?: { medium?: { url?: string } };
          };
        }): FeedItem => ({
          title: it.snippet?.title ?? "Untitled video",
          url: `https://www.youtube.com/watch?v=${it.id.videoId}`,
          image_url: it.snippet?.thumbnails?.medium?.url ?? null,
          author: it.snippet?.channelTitle ?? null,
          source_platform: "youtube",
          kind: "video",
        }));
    } catch {
      return [];
    }
  },
};

// Connect-later stubs.
function stubAdapter(platform: MetricPlatform): FeedAdapter {
  return { platform, async fetch() { return []; } };
}

export const FEED_ADAPTERS: Record<MetricPlatform, FeedAdapter> = {
  youtube: youtubeAdapter,
  x: stubAdapter("x"),
  linkedin: stubAdapter("linkedin"),
  instagram: stubAdapter("instagram"),
  tiktok: stubAdapter("tiktok"),
};
