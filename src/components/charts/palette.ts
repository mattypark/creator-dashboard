import type { MetricPlatform } from "@/lib/types";

/**
 * Heritage-toned platform marks for charts and dots. Muted versions of each
 * brand hue so data sits inside the cream/ink/gold/green system instead of
 * shouting over it. Values live as CSS vars in globals.css.
 */
export const PLATFORM_COLOR: Record<MetricPlatform, string> = {
  x: "var(--data-x)",
  linkedin: "var(--data-linkedin)",
  youtube: "var(--data-youtube)",
  instagram: "var(--data-instagram)",
  tiktok: "var(--data-tiktok)",
};

/** Gender split: green, gold, warm neutral. */
export const GENDER_COLORS = [
  "var(--blueberry)",
  "var(--mango)",
  "#a89e88",
];
