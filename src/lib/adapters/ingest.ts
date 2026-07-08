import type { KnowledgeKind, MetricPlatform } from "../types";

/**
 * Keyless link ingestion. Given a URL, best-effort resolve title / thumbnail /
 * author so a pasted link fills a card instantly — no API keys required.
 *
 * Resolution order: YouTube oEmbed (no key) -> OpenGraph meta scrape ->
 * hostname fallback. Never throws: callers get a usable result regardless.
 */

export interface IngestResult {
  kind: KnowledgeKind;
  title: string;
  url: string;
  image_url: string | null;
  author: string | null;
  source_platform: MetricPlatform | null;
  raw_text: string | null;
}

const FETCH_TIMEOUT_MS = 6000;
const MAX_HTML_BYTES = 512 * 1024; // don't slurp huge pages

/**
 * Block non-public targets to avoid SSRF (localhost, link-local, private
 * ranges, cloud metadata). Single-user tool, but any URL-fetch is a boundary.
 */
export function isSafePublicUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;

  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "[::1]"
  ) {
    return false;
  }

  // Block literal private / link-local IPv4.
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 0) return false;
    if (a === 169 && b === 254) return false; // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
  }
  return true;
}

const HOSTS: { match: RegExp; platform: MetricPlatform; kind: KnowledgeKind }[] = [
  { match: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/, platform: "youtube", kind: "video" },
  { match: /(^|\.)x\.com$|(^|\.)twitter\.com$/, platform: "x", kind: "tweet" },
  { match: /(^|\.)linkedin\.com$/, platform: "linkedin", kind: "link" },
  { match: /(^|\.)instagram\.com$/, platform: "instagram", kind: "link" },
  { match: /(^|\.)tiktok\.com$/, platform: "tiktok", kind: "video" },
];

function classify(host: string): { platform: MetricPlatform | null; kind: KnowledgeKind } {
  for (const h of HOSTS) if (h.match.test(host)) return { platform: h.platform, kind: h.kind };
  return { platform: null, kind: "link" };
}

async function timedFetch(url: string, init?: RequestInit): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { "user-agent": "SecondBrainBot/1.0 (+content-dashboard)", ...init?.headers },
      redirect: "follow",
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function metaContent(html: string, patterns: string[]): string | null {
  for (const key of patterns) {
    // property="og:title" content="..."  OR  name="author" content="..."
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`,
      "i",
    );
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1]).trim();
    // content-first ordering
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`,
      "i",
    );
    const m2 = html.match(re2);
    if (m2?.[1]) return decodeEntities(m2[1]).trim();
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

async function youtubeOembed(url: string): Promise<Partial<IngestResult> | null> {
  const res = await timedFetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
  );
  if (!res || !res.ok) return null;
  try {
    const j = await res.json();
    return {
      title: j.title ?? undefined,
      author: j.author_name ?? null,
      image_url: j.thumbnail_url ?? null,
    };
  } catch {
    return null;
  }
}

async function scrapeOpenGraph(url: string): Promise<Partial<IngestResult> | null> {
  const res = await timedFetch(url);
  if (!res || !res.ok) return null;
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) return null;
  const buf = await res.arrayBuffer();
  const html = new TextDecoder().decode(buf.slice(0, MAX_HTML_BYTES));

  const title =
    metaContent(html, ["og:title", "twitter:title"]) ??
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ??
    null;
  const image = metaContent(html, ["og:image", "twitter:image"]);
  const author = metaContent(html, ["author", "article:author", "og:site_name"]);
  const description = metaContent(html, ["og:description", "description"]);

  return {
    title: title ? decodeEntities(title) : undefined,
    image_url: image,
    author,
    raw_text: description,
  };
}

export async function fetchMetadata(url: string): Promise<IngestResult> {
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  const { platform, kind } = classify(host);

  const fallback: IngestResult = {
    kind,
    title: host || url,
    url,
    image_url: null,
    author: null,
    source_platform: platform,
    raw_text: null,
  };

  if (!isSafePublicUrl(url)) return fallback;

  let meta: Partial<IngestResult> | null = null;
  if (platform === "youtube") meta = await youtubeOembed(url);
  if (!meta) meta = await scrapeOpenGraph(url);
  if (!meta) return fallback;

  return {
    ...fallback,
    title: meta.title || fallback.title,
    image_url: meta.image_url ?? null,
    author: meta.author ?? null,
    raw_text: meta.raw_text ?? null,
  };
}
