"use client";

import { useCallback, useEffect, useState } from "react";
import type { AudienceProfile, MetricSnapshot, Post } from "@/lib/types";
import type { MetricGroup } from "@/components/metrics/MetricsSidebar";
import { fmt } from "@/lib/format";
import { DonutChart, type Slice } from "@/components/charts/DonutChart";
import { TrendLine } from "@/components/charts/TrendLine";
import { ActiveHours } from "@/components/charts/ActiveHours";
import { AudienceBars } from "@/components/mediakit/AudienceBars";

import { PLATFORM_COLOR, GENDER_COLORS } from "@/components/charts/palette";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card card-hover p-5 flex flex-col gap-3.5">
      <p className="kicker">{title}</p>
      {children}
    </div>
  );
}

type Props = { groups: MetricGroup[]; reloadKey: number };

export function AnalyticsCharts({ groups, reloadKey }: Props) {
  const [profiles, setProfiles] = useState<AudienceProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [history, setHistory] = useState<MetricSnapshot[]>([]);

  // Followers per platform -> donut slices.
  const followerSlices: Slice[] = groups
    .map((g) => {
      const f = g.metrics.find(
        (m) => m.metric_key === "followers" || m.metric_key === "subscribers",
      );
      return f
        ? { label: g.label, value: f.value, color: PLATFORM_COLOR[g.platform] }
        : null;
    })
    .filter((s): s is Slice => s !== null && s.value > 0);

  const topPlatform = followerSlices.slice().sort((a, b) => b.value - a.value)[0];
  const totalAudience = followerSlices.reduce((s, d) => s + d.value, 0);

  const load = useCallback(async () => {
    const [aud, po] = await Promise.all([
      fetch("/api/audience").then((x) => x.json()),
      fetch("/api/posts").then((x) => x.json()),
    ]);
    setProfiles(aud.profiles ?? []);
    setPosts(po.posts ?? []);
  }, []);

  useEffect(() => {
    async function runLoad() {
      await load();
    }
    runLoad();
  }, [load, reloadKey]);

  // Growth history for the biggest platform's followers.
  useEffect(() => {
    const g = groups
      .map((gr) => {
        const f = gr.metrics.find(
          (m) => m.metric_key === "followers" || m.metric_key === "subscribers",
        );
        return f ? { platform: gr.platform, key: f.metric_key, value: f.value } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (b!.value ?? 0) - (a!.value ?? 0))[0];
    if (!g) return;
    fetch(`/api/metrics/history?platform=${g.platform}&key=${g.key}`)
      .then((x) => x.json())
      .then((d) => setHistory(d.history ?? []))
      .catch(() => {});
  }, [groups, reloadKey]);

  // Prefer an "overall" profile, else the richest one.
  const profile =
    profiles.find((p) => p.platform === "overall") ??
    profiles.slice().sort((a, b) => score(b) - score(a))[0];

  const topPosts = posts.slice().sort((a, b) => b.views - a.views).slice(0, 5);

  const trendPoints = history.map((h) => ({ label: h.captured_at, value: h.value }));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card title="Audience by platform">
        {followerSlices.length ? (
          <DonutChart
            data={followerSlices}
            centerLabel={fmt(totalAudience)}
            centerSub="total"
          />
        ) : (
          <p className="text-xs text-[var(--muted)]">Add follower counts to see the split.</p>
        )}
      </Card>

      <Card title={`Growth${topPlatform ? ` — ${topPlatform.label}` : ""}`}>
        <TrendLine points={trendPoints} />
      </Card>

      {profile && profile.gender.length > 0 && (
        <Card title="Gender">
          <DonutChart
            data={profile.gender.map((g, i) => ({
              label: g.label,
              value: g.pct,
              color: GENDER_COLORS[i % GENDER_COLORS.length],
            }))}
            size={130}
          />
        </Card>
      )}

      {profile && profile.active_hours.length > 0 && (
        <Card title="When your audience is active">
          <ActiveHours hours={profile.active_hours} />
        </Card>
      )}

      {profile && profile.age.length > 0 && (
        <Card title="Age">
          <AudienceBars title="" bars={profile.age} accent="mango" />
        </Card>
      )}

      {profile && profile.geo.length > 0 && (
        <Card title="Top geographies">
          <AudienceBars title="" bars={profile.geo} flags />
        </Card>
      )}

      {topPosts.length > 0 && (
        <Card title="Top posts">
          <ol className="flex flex-col divide-y divide-[var(--border)]/70">
            {topPosts.map((p, i) => (
              <TopPostRow key={p.id} post={p} index={i} onSaved={load} />
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}

function score(p: AudienceProfile): number {
  return p.gender.length + p.age.length + p.geo.length + p.active_hours.length;
}

/** Ledger row with click-to-edit views (manual override for blocked platforms). */
function TopPostRow({
  post,
  index,
  onSaved,
}: {
  post: Post;
  index: number;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(post.views ?? 0));
  const [busy, setBusy] = useState(false);

  async function save() {
    const views = Number(draft.replace(/[,\s]/g, ""));
    if (!Number.isFinite(views) || views < 0) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, views }),
      });
      setEditing(false);
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="group flex items-center gap-3 py-2 text-sm first:pt-0 last:pb-0">
      <span className="w-5 shrink-0 font-serif text-xs font-semibold text-[var(--muted)]/70 tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="truncate">{post.title}</span>
      {editing ? (
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            inputMode="numeric"
            autoFocus
            className="w-24 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-right text-sm tabular-nums outline-none focus:border-[var(--mango)]"
          />
          <button
            onClick={save}
            disabled={busy}
            className="text-[11px] font-medium text-[var(--mango)] hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "…" : "save"}
          </button>
        </span>
      ) : (
        <button
          onClick={() => {
            setDraft(String(post.views ?? 0));
            setEditing(true);
          }}
          title="Click to edit views"
          className="ml-auto shrink-0 rounded px-1 font-medium text-[var(--blueberry)] tabular-nums transition-colors hover:bg-[var(--surface-2)]"
        >
          {fmt(post.views)}
        </button>
      )}
    </li>
  );
}
