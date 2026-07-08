"use client";

import type { MetricPlatform } from "@/lib/types";
import { MetricCard } from "./MetricCard";
import { OverallCard } from "./OverallCard";

export type MetricGroup = {
  platform: MetricPlatform;
  label: string;
  color: string;
  metrics: { metric_key: string; value: number }[];
};

type Props = {
  groups: MetricGroup[];
  overall: Record<string, number>;
  isBusy: boolean;
  onRefresh: () => void;
};

export function MetricsSidebar({ groups, overall, isBusy, onRefresh }: Props) {
  return (
    <aside className="w-72 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold tracking-wide">METRICS</h1>
        <button
          onClick={onRefresh}
          disabled={isBusy}
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
        >
          {isBusy ? "…" : "↻ refresh"}
        </button>
      </div>

      <OverallCard overall={overall} />

      {groups.map((g) => (
        <MetricCard key={g.platform} group={g} />
      ))}
    </aside>
  );
}
