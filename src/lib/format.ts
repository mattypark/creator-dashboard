import type { ScriptStatus } from "./types";

/** Compact number format: 1_200_000 -> "1.2M", 3_400 -> "3.4K". */
export const fmt = (n: number): string =>
  n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + "M"
    : n >= 1_000
      ? (n / 1_000).toFixed(1) + "K"
      : String(n);

/** Human labels for the kanban columns. */
export const STATUS_LABEL: Record<ScriptStatus, string> = {
  idea: "Ideas",
  script: "Scripts",
  ready: "Ready",
  scheduled: "Scheduled",
  posted: "Posted",
};
