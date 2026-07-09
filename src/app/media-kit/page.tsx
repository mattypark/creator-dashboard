"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fmt } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { AudienceBars } from "@/components/mediakit/AudienceBars";
import { DonutChart } from "@/components/charts/DonutChart";
import { ActiveHours } from "@/components/charts/ActiveHours";
import type { MetricGroup } from "@/components/metrics/MetricsSidebar";
import type { AudienceProfile, Post } from "@/lib/types";
import {
  identity,
  platforms,
  audience,
  showcase,
  services,
  modifiers,
  partners,
} from "@/data/kit";

import { GENDER_COLORS } from "@/components/charts/palette";

function richness(p: AudienceProfile): number {
  return p.gender.length + p.age.length + p.geo.length + p.active_hours.length;
}

// Animate on mount (not whileInView) so content is always visible even
// without scroll — matters for headless capture and the future PNG export.
const reveal = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section className="flex flex-col gap-5" {...reveal}>
      <h2 className="font-serif text-2xl font-semibold tracking-tight">{title}</h2>
      {children}
    </motion.section>
  );
}

export default function MediaKitPage() {
  // Live follower override: metric_key followers|subscribers per platform.
  const [live, setLive] = useState<Record<string, number>>({});
  const [profile, setProfile] = useState<AudienceProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/metrics").then((x) => x.json()),
      fetch("/api/audience").then((x) => x.json()),
      fetch("/api/posts").then((x) => x.json()),
    ])
      .then(([m, a, p]) => {
        const map: Record<string, number> = {};
        for (const g of (m.byPlatform as MetricGroup[]) ?? []) {
          const f = g.metrics.find(
            (mm) => mm.metric_key === "followers" || mm.metric_key === "subscribers",
          );
          if (f) map[g.platform] = f.value;
        }
        setLive(map);
        const profs = (a.profiles ?? []) as AudienceProfile[];
        const best =
          profs.find((x) => x.platform === "overall") ??
          profs.slice().sort((x, y) => richness(y) - richness(x))[0] ??
          null;
        setProfile(best);
        if (best) setSyncedAt(best.updated_at);
        setPosts((p.posts ?? []) as Post[]);
      })
      .catch(() => {});
  }, []);

  // Prefer live audience data, fall back to the editable kit defaults.
  const genderBars = profile?.gender.length ? profile.gender : audience.gender;
  const ageBars = profile?.age.length ? profile.age : audience.age;
  const geoBars = profile?.geo.length ? profile.geo : audience.geo;
  const activeHours = profile?.active_hours ?? [];
  const topPosts = posts.slice().sort((a, b) => b.views - a.views).slice(0, 3);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="mx-auto w-full max-w-5xl px-6 py-8 flex flex-col gap-12">
        <PageHeader
          kicker="Press · Partnerships"
          title="Media Kit"
          action={
            syncedAt ? (
              <span className="text-xs text-[var(--muted)]">
                Synced {new Date(syncedAt).toLocaleDateString()}
              </span>
            ) : undefined
          }
        />

        {/* Identity + headline */}
        <motion.section className="flex flex-col gap-6" {...reveal}>
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl font-semibold tracking-tight">
              {identity.name}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {identity.title} · {identity.location}
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--foreground)]/85">
              {identity.bio}
            </p>
            <a
              href={`mailto:${identity.email}`}
              className="mt-4 inline-block text-sm font-medium text-[var(--mango)] hover:brightness-110"
            >
              {identity.email} →
            </a>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {identity.headline.map((m) => (
              <div
                key={m.label}
                className="stat-tile"
                data-accent={m.highlight ? "true" : undefined}
              >
                <p className="kicker">{m.label}</p>
                <p
                  className={`mt-1 font-serif text-3xl font-semibold tracking-[-0.02em] sm:text-4xl ${
                    m.highlight ? "text-[var(--mango)]" : ""
                  }`}
                >
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Platforms */}
        <Section title="Platforms">
          <div className="grid gap-4 sm:grid-cols-2">
            {platforms.map((p) => {
              const followers =
                live[p.key] != null ? fmt(live[p.key]) : p.followers;
              return (
                <div key={p.key} className="card card-hover p-5">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                      >
                        @{p.handle}
                      </a>
                    </div>
                    <div className="text-right">
                      <div className="font-serif text-2xl font-semibold tabular-nums tracking-tight text-[var(--blueberry)]">
                        {followers}
                      </div>
                      {p.followersDelta && (
                        <div className="text-[11px] text-[var(--muted)]">
                          {p.followersDelta}
                        </div>
                      )}
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-3">
                    {p.metrics.map((m) => (
                      <div key={m.label}>
                        <dt className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                          {m.label}
                        </dt>
                        <dd
                          className={`text-sm font-semibold ${m.highlight ? "text-[var(--mango)]" : ""}`}
                        >
                          {m.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Audience */}
        <Section title="Audience">
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="flex flex-col gap-3">
              <p className="kicker">Gender</p>
              <DonutChart
                data={genderBars.map((g, i) => ({
                  label: g.label,
                  value: g.pct,
                  color: GENDER_COLORS[i % GENDER_COLORS.length],
                }))}
                size={130}
              />
            </div>
            <AudienceBars title="Age" bars={ageBars} accent="mango" />
            <AudienceBars title="Top geographies" bars={geoBars} flags />
            {activeHours.length > 0 ? (
              <div className="flex flex-col gap-3">
                <p className="kicker">When they&apos;re active</p>
                <ActiveHours hours={activeHours} />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="kicker">Interests</p>
                <div className="flex flex-wrap gap-1.5">
                  {audience.interests.map((t) => (
                    <Chip key={t} variant="blueberry">
                      {t}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Showcase */}
        <Section title="Top content">
          <div className="grid gap-4 sm:grid-cols-3">
            {(topPosts.length
              ? topPosts.map((p) => ({
                  title: p.title,
                  views: fmt(p.views),
                  platform: p.platform,
                }))
              : showcase
            ).map((s) => (
              <div key={s.title} className="card card-hover p-5 flex flex-col gap-2">
                <div className="font-serif text-lg font-semibold leading-snug">
                  {s.title}
                </div>
                <div className="mt-auto flex items-center justify-between text-xs text-[var(--muted)]">
                  <span className="uppercase tracking-wide">{s.platform}</span>
                  <span className="font-semibold text-[var(--mango)]">{s.views} views</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Services / rate card */}
        <Section title="Work with me">
          <div className="grid gap-4 sm:grid-cols-3">
            {services.map((sv) => (
              <div
                key={sv.name}
                className={`p-5 flex flex-col gap-3 ${
                  sv.featured ? "note-gold" : "card card-hover"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{sv.name}</span>
                  {sv.featured && <Chip variant="mango">Popular</Chip>}
                </div>
                <ul className="flex flex-col gap-1.5 text-sm text-[var(--foreground)]/80">
                  {sv.includes.map((it) => (
                    <li key={it} className="flex gap-2">
                      <span className="text-[var(--mango)]">·</span>
                      {it}
                    </li>
                  ))}
                </ul>
                <span className="mt-auto pt-1 text-xs text-[var(--muted)]">
                  Contact for rates
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="kicker mr-1">Add-ons</span>
            {modifiers.map((m) => (
              <Chip key={m} variant="outline">
                {m}
              </Chip>
            ))}
          </div>
        </Section>

        {/* Partners */}
        <Section title="Trusted by">
          <div className="flex flex-wrap gap-2">
            {partners.map((p) => (
              <Chip key={p} variant="solid" className="px-3 py-1 text-xs">
                {p}
              </Chip>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
