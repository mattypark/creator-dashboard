import { getDb } from "@/lib/db";
import type { MetricPlatform } from "@/lib/types";

/** Time series for one (platform, metric_key) — powers the growth graph. */
export async function GET(request: Request) {
  const db = getDb();
  const params = new URL(request.url).searchParams;
  const platform = params.get("platform") as MetricPlatform | null;
  const key = params.get("key");
  if (!platform || !key)
    return Response.json({ error: "platform and key required" }, { status: 400 });
  const history = await db.listMetricHistory(platform, key);
  return Response.json({ history });
}
