"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ExternalLink, RefreshCw } from "lucide-react";
import {
  PLATFORM_META,
  type AudienceProfile,
  type MetricPlatform,
  type MetricSnapshot,
  type Post,
} from "@/lib/types";
import { fmt } from "@/lib/format";
import { DEFAULT_HANDLES, profileUrl } from "@/data/handles";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { Button } from "@/components/ui/Button";
import { TrendLine } from "@/components/charts/TrendLine";
import { ActiveHours } from "@/components/charts/ActiveHours";
import { AudienceBars } from "@/components/mediakit/AudienceBars";

const VALID: MetricPlatform[] = ["x", "youtube", "linkedin", "instagram", "tiktok"];

export default function PlatformDashboard() {
  const params = useParams<{ platform: string }>();
  const platform = VALID.includes(params.platform as MetricPlatform)
    ? (params.platform as MetricPlatform)
    : null;

  const [posts, setPosts] = useState<Post[]>([]);
  const [metrics, setMetrics] = useState<MetricSnapshot[]>([]);
  const [history, setHistory] = useState<MetricSnapshot[]>([]);
  const [profile, setProfile] = useState<AudienceProfile | null>(null);
  const [handle, setHandle] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    if (!platform) return;
    const [po, me, aud] = await Promise.all([
      fetch(`/api/posts?platform=${platform}`).then((x) => x.json()),
      fetch("/api/metrics").then((x) => x.json()),
      fetch("/api/audience").then((x) => x.json()),
    ]);
    setPosts(po.posts ?? []);
    const group = (me.byPlatform ?? []).find(
      (g: { platform: string }) => g.platform === platform,
    );
    setMetrics(group?.metrics ?? []);
    setProfile(
      ((aud.profiles ?? []) as AudienceProfile[]).find(
        (p) => p.platform === platform,
      ) ?? null,
    );
    const fKey = platform === "youtube" ? "subscribers" : "followers";
    fetch(`/api/metrics/history?platform=${platform}&key=${fKey}`)
      .then((x) => x.json())
      .then((d) => setHistory(d.history ?? []))
      .catch(() => {});
  }, [platform]);

  useEffect(() => {
    load();
    try {
      const raw = localStorage.getItem("hub_handles");
      const saved = raw ? JSON.parse(raw) : {};
      if (platform) setHandle(saved[platform] || DEFAULT_HANDLES[platform]);
    } catch {
      if (platform) setHandle(DEFAULT_HANDLES[platform]);
    }
  }, [load, platform]);

  if (!platform) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-[var(--muted)]">
        Unknown platform.
      </div>
    );
  }

  const meta = PLATFORM_META[platform];

  async function addLink() {
    if (!link.trim()) return;
    setBusy("add");
    try {
      const r = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, url: link.trim() }),
      });
      if (!r.ok) {
        flash("Could not add link");
        return;
      }
      setLink("");
      await load();
      flash("Post added — stats fetched where available");
    } finally {
      setBusy(null);
    }
  }

  async function refreshStats() {
    setBusy("refresh");
    try {
      const r = await fetch("/api/refresh-posts", { method: "POST" }).then((x) =>
        x.json(),
      );
      await load();
      flash(`Refreshed ${r.updated}/${r.checked} posts`);
    } finally {
      setBusy(null);
    }
  }

  async function removePost(id: string) {
    await fetch("/api/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  const followers = metrics.find(
    (m) => m.metric_key === "followers" || m.metric_key === "subscribers",
  );
  const views = metrics.find((m) => m.metric_key === "views");
  const totalPostViews = posts.reduce((s, p) => s + p.views, 0);
  const trendPoints = history.map((h) => ({ label: h.captured_at, value: h.value }));

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="mx-auto w-full max-w-5xl px-6 py-8 flex flex-col gap-8">
        <PageHeader
          kicker={`@${handle}`}
          title={meta.label}
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshStats}
                disabled={busy === "refresh"}
              >
                <RefreshCw size={13} />
                {busy === "refresh" ? "Refreshing…" : "Refresh stats"}
              </Button>
              <a
                href={profileUrl(platform, handle)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Open profile <ExternalLink size={13} />
              </a>
            </div>
          }
        />

        {/* Stat tiles */}
        <section className="grid gap-5 grid-cols-2 lg:grid-cols-3">
          <StatTile
            label={platform === "youtube" ? "Subscribers" : "Followers"}
            value={followers?.value ?? 0}
            accent
          />
          <StatTile label="Platform views" value={views?.value ?? 0} sub="latest snapshot" />
          <StatTile label="Tracked post views" value={totalPostViews} sub={`${posts.length} posts`} />
        </section>

        {/* Growth */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="kicker mb-2">Growth</p>
          <TrendLine points={trendPoints} color={meta.color} />
        </section>

        {/* Paste a link */}
        <section className="rounded-xl border border-[var(--mango)]/30 bg-[var(--mango)]/5 p-4 flex flex-col gap-2">
          <p className="kicker">Track a post</p>
          <div className="flex gap-2">
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addLink()}
              placeholder={`Paste a ${meta.label} post link — stats fetch automatically`}
              className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--mango)]"
            />
            <Button onClick={addLink} disabled={busy === "add" || !link.trim()}>
              {busy === "add" ? "Fetching…" : "Add"}
            </Button>
          </div>
          <p className="text-[11px] text-[var(--muted)]">
            Auto-refreshes every 2 days.{" "}
            {platform === "youtube"
              ? "YouTube pulls real view/like counts."
              : "Counts are best-effort for this platform — upload an analytics screenshot in Hub for full numbers."}
          </p>
        </section>

        {/* Posts grid */}
        <section className="flex flex-col gap-4">
          <h2 className="font-serif text-xl font-semibold tracking-tight">
            Your posts
          </h2>
          {posts.length === 0 ? (
            <div className="text-sm text-[var(--muted)] text-center border border-dashed border-[var(--border)] rounded-xl py-14">
              No posts tracked yet. Paste a link above.
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <article
                  key={p.id}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden flex flex-col hover:border-[var(--muted)] transition-colors"
                >
                  {p.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt=""
                      className="w-full h-36 object-cover border-b border-[var(--border)]"
                      loading="lazy"
                    />
                  )}
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium leading-snug hover:underline line-clamp-2"
                      >
                        {p.title}
                      </a>
                    ) : (
                      <div className="text-sm font-medium leading-snug line-clamp-2">
                        {p.title}
                      </div>
                    )}
                    <div className="grid grid-cols-4 gap-1 text-center mt-auto pt-1">
                      {[
                        ["views", p.views],
                        ["likes", p.likes],
                        ["comments", p.comments],
                        ["shares", p.shares],
                      ].map(([label, value]) => (
                        <div key={label as string}>
                          <div className="text-sm font-semibold tabular-nums">
                            {fmt(value as number)}
                          </div>
                          <div className="text-[9px] uppercase tracking-wide text-[var(--muted)]">
                            {label as string}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[var(--muted)]">
                      <span>
                        {p.posted_at
                          ? new Date(p.posted_at).toLocaleDateString()
                          : "no date"}
                      </span>
                      <button
                        onClick={() => removePost(p.id)}
                        className="hover:text-red-500"
                      >
                        remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Audience (per-platform, when ingested) */}
        {profile && (
          <section className="flex flex-col gap-4">
            <h2 className="font-serif text-xl font-semibold tracking-tight">
              Audience
            </h2>
            <div className="grid gap-8 sm:grid-cols-2">
              {profile.age.length > 0 && (
                <AudienceBars title="Age" bars={profile.age} accent="mango" />
              )}
              {profile.geo.length > 0 && (
                <AudienceBars title="Top geographies" bars={profile.geo} flags />
              )}
              {profile.active_hours.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="kicker">When they&apos;re active</p>
                  <ActiveHours hours={profile.active_hours} />
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[var(--foreground)] text-[var(--background)] rounded-lg px-4 py-2 text-sm shadow-lg z-30">
          {toast}
        </div>
      )}
    </div>
  );
}
