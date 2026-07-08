"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import type { KnowledgeItem } from "@/lib/types";
import type { MetricGroup } from "@/components/metrics/MetricsSidebar";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { Button } from "@/components/ui/Button";
import { BrainCapture } from "@/components/brain/BrainCapture";
import { KnowledgeCard } from "@/components/brain/KnowledgeCard";
import { AnalyticsCharts } from "@/components/hub/AnalyticsCharts";

type Stats = {
  audience: number;
  views: number;
  captures: number;
  suggestions: number;
};

export default function Overview() {
  const [stats, setStats] = useState<Stats>({
    audience: 0,
    views: 0,
    captures: 0,
    suggestions: 0,
  });
  const [recent, setRecent] = useState<KnowledgeItem[]>([]);
  const [groups, setGroups] = useState<MetricGroup[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [agentBusy, setAgentBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flash = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    const [metrics, knowledge, suggestions] = await Promise.all([
      fetch("/api/metrics").then((x) => x.json()),
      fetch("/api/knowledge").then((x) => x.json()),
      fetch("/api/suggestions?status=new").then((x) => x.json()),
    ]);
    const overall: Record<string, number> = metrics.overall ?? {};
    const byPlatform = (metrics.byPlatform ?? []) as MetricGroup[];
    setGroups(byPlatform);
    const views = byPlatform
      .flatMap((g) => g.metrics)
      .filter((m) => m.metric_key === "views")
      .reduce((sum, m) => sum + m.value, 0);
    setStats({
      audience: (overall.followers ?? 0) + (overall.subscribers ?? 0),
      views,
      captures: (knowledge.items as KnowledgeItem[]).length,
      suggestions: (suggestions.suggestions ?? []).length,
    });
    setRecent((knowledge.items as KnowledgeItem[]).slice(0, 6));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runAgent() {
    setAgentBusy(true);
    try {
      const r = await fetch("/api/agent", { method: "POST" }).then((x) => x.json());
      await load();
      setReloadKey((k) => k + 1);
      flash(
        r.ai
          ? `Agent: ${r.suggestions} ideas, ${r.edges} links`
          : `Agent backfilled ${r.backfilled} — add a key for ideas`,
      );
    } finally {
      setAgentBusy(false);
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="mx-auto w-full max-w-5xl px-6 py-8 flex flex-col gap-10">
        <PageHeader kicker="Your content" title="Overview" />

        {/* Act on today */}
        <section className="rounded-xl border border-[var(--mango)]/30 bg-[var(--mango)]/5 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="kicker flex items-center gap-2">
              <Sparkles size={13} className="text-[var(--mango)]" /> Capture today
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={runAgent}
              disabled={agentBusy}
            >
              <Sparkles size={13} /> {agentBusy ? "Thinking…" : "Run agent"}
            </Button>
          </div>
          <BrainCapture onCaptured={load} flash={flash} />
        </section>

        {/* Stat tiles */}
        <section className="grid gap-5 grid-cols-2 lg:grid-cols-4">
          <StatTile label="Audience" value={stats.audience} sub="followers + subs" accent />
          <StatTile label="Total views" value={stats.views} sub="across platforms" />
          <StatTile label="Captures" value={stats.captures} sub="in your brain" />
          <StatTile label="New ideas" value={stats.suggestions} sub="from the agent" />
        </section>

        {/* Analytics — the metrics dashboard (donut, growth, demographics, active hours, top posts) */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold tracking-tight">
              Your metrics
            </h2>
            <Link
              href="/hub"
              className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Connect metrics <ArrowRight size={14} />
            </Link>
          </div>
          <AnalyticsCharts groups={groups} reloadKey={reloadKey} />
        </section>

        {/* Recently captured */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold tracking-tight">
              Recently captured
            </h2>
            <Link
              href="/brain"
              className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-sm text-[var(--muted)] text-center border border-dashed border-[var(--border)] rounded-xl py-14">
              Nothing captured yet. Paste a link or dump a thought above.
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((item) => (
                <KnowledgeCard
                  key={item.id}
                  item={item}
                  onPromote={() => flash("Open Brain to promote")}
                  onDelete={() => flash("Open Brain to manage")}
                  isBusy={false}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[var(--foreground)] text-[var(--background)] rounded-lg px-4 py-2 text-sm shadow-lg z-30">
          {toast}
        </div>
      )}
    </div>
  );
}
