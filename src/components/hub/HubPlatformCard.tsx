"use client";

import { useState } from "react";
import { fmt } from "@/lib/format";
import type { MetricGroup } from "@/components/metrics/MetricsSidebar";
import { PLATFORM_COLOR } from "@/components/charts/palette";

type Props = {
  group: MetricGroup;
  handle: string;
  profileUrl: string | null;
  onSaveHandle: (handle: string) => void;
  onAddMetric: (metricKey: string, value: number) => Promise<void>;
};

export function HubPlatformCard({
  group,
  handle,
  profileUrl,
  onSaveHandle,
  onAddMetric,
}: Props) {
  const [editingHandle, setEditingHandle] = useState(false);
  const [handleDraft, setHandleDraft] = useState(handle);
  const [metricKey, setMetricKey] = useState("followers");
  const [metricValue, setMetricValue] = useState("");
  const [adding, setAdding] = useState(false);

  async function add() {
    const value = Number(metricValue);
    if (!metricKey.trim() || !Number.isFinite(value)) return;
    setAdding(true);
    try {
      await onAddMetric(metricKey.trim(), value);
      setMetricValue("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="card card-hover p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full shadow-[inset_0_0_0_1px_rgba(33,29,20,0.12)]"
          style={{ background: PLATFORM_COLOR[group.platform] ?? group.color }}
        />
        <span className="text-sm font-semibold">{group.label}</span>
        {profileUrl && !editingHandle && (
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-[11px] font-medium text-[var(--blueberry)] transition-colors duration-300 ease-lux hover:text-[var(--foreground)]"
          >
            @{handle} ↗
          </a>
        )}
        {!profileUrl && !editingHandle && (
          <button
            onClick={() => {
              setHandleDraft(handle);
              setEditingHandle(true);
            }}
            className="ml-auto text-[11px] text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            + add handle
          </button>
        )}
      </div>

      {editingHandle && (
        <div className="flex gap-1">
          <input
            value={handleDraft}
            onChange={(e) => setHandleDraft(e.target.value)}
            placeholder="handle (no @)"
            className="input-engraved flex-1 rounded-md px-2 py-1 text-xs outline-none"
          />
          <button
            onClick={() => {
              onSaveHandle(handleDraft.trim().replace(/^@/, ""));
              setEditingHandle(false);
            }}
            className="text-xs bg-[var(--foreground)] text-[var(--background)] rounded-md px-2 py-1 font-medium"
          >
            save
          </button>
        </div>
      )}

      {group.metrics.length === 0 ? (
        <div className="text-xs text-[var(--muted)]">
          No metrics yet — add one below.
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {group.metrics.map((m) => (
            <div key={m.metric_key} className="flex items-baseline justify-between text-sm">
              <span className="capitalize text-[var(--muted)]">
                {m.metric_key}
              </span>
              <span className="font-serif font-semibold tabular-nums">{fmt(m.value)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 mt-1">
        <input
          value={metricKey}
          onChange={(e) => setMetricKey(e.target.value)}
          placeholder="metric"
          className="input-engraved w-24 rounded-md px-2 py-1 text-xs outline-none"
        />
        <input
          value={metricValue}
          onChange={(e) => setMetricValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          inputMode="numeric"
          placeholder="value"
          className="input-engraved flex-1 rounded-md px-2 py-1 text-xs outline-none"
        />
        <button
          onClick={add}
          disabled={adding || !metricValue.trim()}
          className="btn-engraved rounded-md px-2 py-1 text-xs disabled:opacity-50"
        >
          {adding ? "…" : "add"}
        </button>
      </div>
    </div>
  );
}
