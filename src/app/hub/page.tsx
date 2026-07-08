"use client";

import { useCallback, useEffect, useState } from "react";
import type { MetricPlatform } from "@/lib/types";
import type { MetricGroup } from "@/components/metrics/MetricsSidebar";
import { OverallCard } from "@/components/metrics/OverallCard";
import { HubPlatformCard } from "@/components/hub/HubPlatformCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { DEFAULT_HANDLES, profileUrl } from "@/data/handles";
import { MetricsUpload } from "@/components/hub/MetricsUpload";
import { PostEntry } from "@/components/hub/PostEntry";
import { AnalyticsCharts } from "@/components/hub/AnalyticsCharts";

const HANDLES_KEY = "hub_handles";

export default function HubPage() {
  const [groups, setGroups] = useState<MetricGroup[]>([]);
  const [overall, setOverall] = useState<Record<string, number>>({});
  const [handles, setHandles] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const refreshAll = useCallback(() => setReloadKey((k) => k + 1), []);

  const flash = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    const r = await fetch("/api/metrics").then((x) => x.json());
    setGroups(r.byPlatform);
    setOverall(r.overall);
  }, []);

  useEffect(() => {
    load();
    try {
      const raw = localStorage.getItem(HANDLES_KEY);
      setHandles({ ...DEFAULT_HANDLES, ...(raw ? JSON.parse(raw) : {}) });
    } catch {
      setHandles({ ...DEFAULT_HANDLES });
    }
  }, [load]);

  function saveHandle(platform: string, handle: string) {
    setHandles((prev) => {
      const next = { ...prev, [platform]: handle };
      try {
        localStorage.setItem(HANDLES_KEY, JSON.stringify(next));
      } catch {
        // ignore quota/availability errors
      }
      return next;
    });
  }

  async function addMetric(
    platform: MetricPlatform,
    metricKey: string,
    value: number,
  ) {
    await fetch("/api/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, metric_key: metricKey, value }),
    });
    await load();
    refreshAll();
    flash("Metric saved");
  }

  async function afterIngest() {
    await load();
    refreshAll();
  }

  async function importPosts() {
    setImporting(true);
    try {
      const r = await fetch("/api/feed", { method: "POST" }).then((x) => x.json());
      flash(
        r.imported > 0
          ? `Imported ${r.imported} post${r.imported === 1 ? "" : "s"} to Brain`
          : "No new posts to import (connect YouTube env to pull uploads)",
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="max-w-5xl mx-auto p-6 flex flex-col gap-5">
        <PageHeader
          kicker="Creator footprint"
          title="Hub"
          action={
            <Button onClick={importPosts} disabled={importing} size="sm">
              {importing ? "Importing…" : "⟳ Import my recent posts"}
            </Button>
          }
        />

        <OverallCard overall={overall} />

        <MetricsUpload onIngested={afterIngest} flash={flash} />

        <AnalyticsCharts groups={groups} reloadKey={reloadKey} />

        <PostEntry onAdded={afterIngest} flash={flash} />

        <h2 className="font-serif text-xl font-semibold tracking-tight mt-2">
          Platforms
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <HubPlatformCard
              key={g.platform}
              group={g}
              handle={handles[g.platform] ?? ""}
              profileUrl={profileUrl(g.platform, handles[g.platform] ?? "")}
              onSaveHandle={(h) => saveHandle(g.platform, h)}
              onAddMetric={(key, value) => addMetric(g.platform, key, value)}
            />
          ))}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[var(--foreground)] text-[var(--background)] rounded-lg px-4 py-2 text-sm shadow-lg z-30">
          {toast}
        </div>
      )}
    </div>
  );
}
