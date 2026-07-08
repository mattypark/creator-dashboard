import type { MetricPlatform } from "@/lib/types";

/**
 * Matthew's real social handles. Central source used by the sidebar links,
 * media kit, and hub. localStorage ("hub_handles") overrides these if the
 * user edits a handle in the Hub.
 */
export const DEFAULT_HANDLES: Record<MetricPlatform, string> = {
  x: "MattyparkW",
  youtube: "matty_park",
  linkedin: "matthew-park-487889350",
  tiktok: "mattparxy",
  instagram: "matty.park",
};

/** Build a public profile URL for a platform + handle. */
export function profileUrl(platform: MetricPlatform, handle: string): string {
  const h = encodeURIComponent(handle);
  switch (platform) {
    case "x":
      return `https://x.com/${h}`;
    case "youtube":
      return `https://www.youtube.com/@${h}`;
    case "linkedin":
      return `https://www.linkedin.com/in/${h}`;
    case "tiktok":
      return `https://www.tiktok.com/@${h}`;
    case "instagram":
      return `https://www.instagram.com/${h}`;
  }
}
