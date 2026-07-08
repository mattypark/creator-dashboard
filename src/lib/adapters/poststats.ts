import type { MetricPlatform } from "../types";
import { isSafePublicUrl, timedFetch } from "./ingest";

/**
 * Best-effort per-post stats given a public post URL.
 *
 * Reliability tiers (by design — platform API reality):
 *  - YouTube: REAL numbers via Data API when YOUTUBE_API_KEY is set,
 *    else oEmbed gives title/thumbnail only.
 *  - X: unofficial syndication endpoint (likes/replies) — fragile, may stop working.
 *  - TikTok: scrapes embedded JSON from the public page — fragile.
 *  - Instagram / LinkedIn: OpenGraph title/thumbnail only (counts are login-walled).
 *
 * Every fetcher returns partial data or null and NEVER throws. A null/missing
 * field means "keep whatever the post already has" — refresh never wipes data.
 */

export interface PostStats {
  title?: string;
  image_url?: string;
  posted_at?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}

export interface ScrapeLogEntry {
  platform: MetricPlatform;
  ok: boolean;
  at: string; // ISO timestamp of the attempt
  note?: string;
}

/** Last scrape result per platform. In-memory only — resets on redeploy. */
export const SCRAPE_LOG: Partial<Record<MetricPlatform, ScrapeLogEntry>> = {};

const num = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

// Realistic browser headers for scrape-y page fetches (TikTok / og-tag pages
// serve empty shells to bot UAs). API / oEmbed / syndication endpoints keep
// timedFetch's default bot UA — they behave fine with it.
const BROWSER_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "accept-language": "en-US,en;q=0.9",
};

const RETRY_DELAY_MS = 650;

/**
 * timedFetch plus one retry (with a short delay) on transient failures only:
 * network error/timeout (null), 429, or 5xx. Hard 4xx (e.g. 404) is final.
 */
async function resilientFetch(url: string, init?: RequestInit): Promise<Response | null> {
  const res = await timedFetch(url, init);
  const transient = !res || res.status === 429 || res.status >= 500;
  if (!transient) return res;
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  return timedFetch(url, init);
}

// --- YouTube -----------------------------------------------------------------

function youtubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("youtu.be")) return u.pathname.slice(1).split("/")[0] || null;
    if (u.pathname.startsWith("/watch")) return u.searchParams.get("v");
    const short = u.pathname.match(/^\/(shorts|live|embed)\/([\w-]{6,})/);
    if (short) return short[2];
    return null;
  } catch {
    return null;
  }
}

async function youtubeStats(url: string): Promise<PostStats | null> {
  const id = youtubeVideoId(url);
  if (!id) return null;

  const key = process.env.YOUTUBE_API_KEY;
  if (key) {
    const res = await resilientFetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${id}&key=${key}`,
    );
    if (res?.ok) {
      try {
        const json = await res.json();
        const item = json?.items?.[0];
        if (item) {
          return {
            title: item.snippet?.title,
            image_url:
              item.snippet?.thumbnails?.medium?.url ??
              item.snippet?.thumbnails?.default?.url,
            posted_at: item.snippet?.publishedAt,
            views: num(item.statistics?.viewCount),
            likes: num(item.statistics?.likeCount),
            comments: num(item.statistics?.commentCount),
          };
        }
      } catch {
        // fall through to oEmbed
      }
    }
  }

  // Keyless fallback: title + thumbnail only.
  const res = await resilientFetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
  );
  if (!res?.ok) return null;
  try {
    const j = await res.json();
    return { title: j.title, image_url: j.thumbnail_url };
  } catch {
    return null;
  }
}

// --- X / Twitter ---------------------------------------------------------------

function tweetId(url: string): string | null {
  const m = url.match(/status(?:es)?\/(\d{8,})/);
  return m?.[1] ?? null;
}

/** Id-derived token the official embed widget computes; falls back to "a". */
function tweetToken(id: string): string {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return "a";
  const token = ((n / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
  return token || "a";
}

async function xStats(url: string): Promise<PostStats | null> {
  const id = tweetId(url);
  if (!id) return null;
  // Unofficial widget-syndication endpoint; no auth, may break at any time.
  const res = await resilientFetch(
    `https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${tweetToken(id)}`,
  );
  if (!res?.ok) return null;
  try {
    // Endpoint sometimes returns an empty body / HTML error page: parse
    // defensively and return whichever fields actually exist.
    const j = await res.json();
    if (!j || typeof j !== "object") return null;
    const stats: PostStats = {
      title: typeof j.text === "string" ? j.text.slice(0, 120) : undefined,
      posted_at: typeof j.created_at === "string" ? j.created_at : undefined,
      likes: num(j.favorite_count),
      comments: num(j.conversation_count),
    };
    if (Object.values(stats).every((v) => v == null)) return null;
    return stats;
  } catch {
    return null;
  }
}

// --- TikTok --------------------------------------------------------------------

async function tiktokStats(url: string): Promise<PostStats | null> {
  const res = await resilientFetch(url, { headers: BROWSER_HEADERS });
  if (!res?.ok) return null;
  try {
    const html = await res.text();
    // Stats live in embedded hydration JSON on the public page. The shape
    // varies: numeric under "stats" ("playCount": 123), string-valued under
    // "statsV2" ("playCount":"123"), and sometimes escaped inside a JSON
    // string (\"playCount\":\"123\"). Key names are identical in all shapes.
    const grab = (key: string) => {
      const m =
        html.match(new RegExp(`"${key}":\\s*"?(\\d+)"?`)) ??
        html.match(new RegExp(`\\\\"${key}\\\\":(?:\\\\")?(\\d+)`));
      return m ? num(m[1]) : undefined;
    };
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
    const image = html.match(/"cover":"([^"]+)"/)?.[1]?.replace(/\\u002F/g, "/");
    const views = grab("playCount");
    const likes = grab("diggCount");
    if (views == null && likes == null && !title) return null;
    return {
      title,
      image_url: image,
      views,
      likes,
      comments: grab("commentCount"),
      shares: grab("shareCount"),
    };
  } catch {
    return null;
  }
}

// --- Instagram / LinkedIn: OpenGraph only ---------------------------------------

async function ogStats(url: string): Promise<PostStats | null> {
  const res = await resilientFetch(url, { headers: BROWSER_HEADERS });
  if (!res?.ok) return null;
  try {
    const html = await res.text();
    const meta = (key: string) =>
      html.match(
        new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`, "i"),
      )?.[1];
    const title = meta("og:title");
    const image = meta("og:image");
    if (!title && !image) return null;
    return { title: title ?? undefined, image_url: image ?? undefined };
  } catch {
    return null;
  }
}

// --- Registry -------------------------------------------------------------------

const FETCHERS: Record<MetricPlatform, (url: string) => Promise<PostStats | null>> = {
  youtube: youtubeStats,
  x: xStats,
  tiktok: tiktokStats,
  instagram: ogStats,
  linkedin: ogStats,
};

/** Detect platform from a post URL. */
export function platformFromUrl(url: string): MetricPlatform | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(host)) return "youtube";
    if (/(^|\.)x\.com$|(^|\.)twitter\.com$/.test(host)) return "x";
    if (/(^|\.)tiktok\.com$/.test(host)) return "tiktok";
    if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
    if (/(^|\.)linkedin\.com$/.test(host)) return "linkedin";
    return null;
  } catch {
    return null;
  }
}

/** Fetch best-effort stats for a post URL. Never throws; null = nothing found. */
export async function fetchPostStats(
  platform: MetricPlatform,
  url: string,
): Promise<PostStats | null> {
  if (!isSafePublicUrl(url)) return null;
  try {
    return await FETCHERS[platform](url);
  } catch {
    return null;
  }
}
