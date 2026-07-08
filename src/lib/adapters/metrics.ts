import type { MetricPlatform, MetricSnapshot } from "../types";

export interface MetricsAdapter {
  platform: MetricPlatform;
  /** Returns current metric snapshots, or [] if not configured / connect-later. */
  fetch(): Promise<Omit<MetricSnapshot, "captured_at">[]>;
}

// --- YouTube (Data API, read-only) — lights up first ----------------------
const youtubeAdapter: MetricsAdapter = {
  platform: "youtube",
  async fetch() {
    const key = process.env.YOUTUBE_API_KEY;
    const channel = process.env.YOUTUBE_CHANNEL_ID;
    if (!key || !channel) return [];
    try {
      const url =
        `https://www.googleapis.com/youtube/v3/channels?part=statistics` +
        `&id=${channel}&key=${key}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      const s = json?.items?.[0]?.statistics;
      if (!s) return [];
      return [
        { platform: "youtube" as const, metric_key: "subscribers", value: Number(s.subscriberCount ?? 0) },
        { platform: "youtube" as const, metric_key: "views", value: Number(s.viewCount ?? 0) },
        { platform: "youtube" as const, metric_key: "videos", value: Number(s.videoCount ?? 0) },
      ];
    } catch {
      return [];
    }
  },
};

// Connect-later stubs: return nothing so the card shows a placeholder.
function stubAdapter(platform: MetricPlatform): MetricsAdapter {
  return { platform, async fetch() { return []; } };
}

export const METRICS_ADAPTERS: Record<MetricPlatform, MetricsAdapter> = {
  youtube: youtubeAdapter,
  x: stubAdapter("x"),
  linkedin: stubAdapter("linkedin"),
  instagram: stubAdapter("instagram"),
  tiktok: stubAdapter("tiktok"),
};
