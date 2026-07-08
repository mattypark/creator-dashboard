import { METRICS_ADAPTERS } from "@/lib/adapters/metrics";
import { getDb } from "@/lib/db";
import {
  PLATFORM_META,
  SUMMABLE_METRIC_KEYS,
  type MetricPlatform,
  type MetricSnapshot,
} from "@/lib/types";

/** Read current metrics (from stored snapshots; falls back to live fetch). */
export async function GET() {
  const db = getDb();
  let snapshots = await db.listLatestMetrics();

  // Demo/first-run: if nothing stored, try a live pull so YouTube lights up.
  if (snapshots.length === 0) {
    const live = await collect();
    snapshots = live.map((m) => ({ ...m, captured_at: new Date().toISOString() }));
  }

  // Group by platform.
  const platforms = Object.keys(PLATFORM_META) as MetricPlatform[];
  const byPlatform = platforms.map((p) => ({
    platform: p,
    label: PLATFORM_META[p].label,
    color: PLATFORM_META[p].color,
    metrics: snapshots.filter((s) => s.platform === p),
  }));

  // Overall rollup: sum only additive keys across platforms.
  const overall: Record<string, number> = {};
  for (const s of snapshots) {
    if (SUMMABLE_METRIC_KEYS.has(s.metric_key))
      overall[s.metric_key] = (overall[s.metric_key] ?? 0) + s.value;
  }

  return Response.json({ byPlatform, overall });
}

/**
 * POST with no body: pull live metrics from every adapter and persist.
 * POST { platform, metric_key, value }: store one manually-entered metric —
 * this is how platforms without live API access (X, IG, TikTok) still fill in.
 */
export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json().catch(() => ({}));

  if (body && body.platform && body.metric_key && body.value != null) {
    const value = Number(body.value);
    if (!Number.isFinite(value))
      return Response.json({ error: "value must be a number" }, { status: 400 });
    await db.insertMetric({
      platform: body.platform as MetricPlatform,
      metric_key: String(body.metric_key),
      value,
    });
    return Response.json({ inserted: 1 });
  }

  const collected = await collect();
  for (const m of collected) await db.insertMetric(m);
  return Response.json({ inserted: collected.length });
}

async function collect(): Promise<Omit<MetricSnapshot, "captured_at">[]> {
  const all = await Promise.all(
    Object.values(METRICS_ADAPTERS).map((a) => a.fetch()),
  );
  return all.flat();
}
