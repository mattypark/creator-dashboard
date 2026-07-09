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
              <li
                key={p.id}
                className="flex items-center gap-3 py-2 text-sm first:pt-0 last:pb-0"
              >
                <span className="w-5 shrink-0 font-serif text-xs font-semibold text-[var(--muted)]/70 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="truncate">{p.title}</span>
                <span className="ml-auto shrink-0 font-medium text-[var(--blueberry)] tabular-nums">
                  {fmt(p.views)}
                </span>
              </li>
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
