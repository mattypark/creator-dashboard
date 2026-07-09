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
    async function runLoad() {
      await load();
    }
    runLoad();

    function restoreHandles() {
      try {
        const raw = localStorage.getItem(HANDLES_KEY);
        setHandles({ ...DEFAULT_HANDLES, ...(raw ? JSON.parse(raw) : {}) });
      } catch {
        setHandles({ ...DEFAULT_HANDLES });
      }
    }
    restoreHandles();
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
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-8">
        <PageHeader
          kicker="Creator footprint"
          title="Hub"
          action={
            <Button onClick={importPosts} disabled={importing} size="sm">
              {importing ? "Importing…" : "⟳ Import my recent posts"}
            </Button>
          }
        />

        <section className="flex flex-col gap-4">
          <OverallCard overall={overall} />
          <MetricsUpload onIngested={afterIngest} flash={flash} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight">
            Analytics
          </h2>
          <AnalyticsCharts groups={groups} reloadKey={reloadKey} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight">
            Platforms
          </h2>
          <PostEntry onAdded={afterIngest} flash={flash} />
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-[var(--foreground)] px-5 py-2 text-sm text-[var(--background)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_12px_32px_-12px_rgba(33,29,20,0.6)]">
          {toast}
        </div>
      )}
    </div>
  );
}
