import { PUBLISH_ADAPTERS } from "@/lib/adapters/publish";
import { getDb } from "@/lib/db";

const MAX_RETRIES = 3;

/**
 * Vercel Cron hits this on an interval. Posts fire on the polling interval,
 * not exactly at scheduled_at. Protected by CRON_SECRET when set.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`)
      return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const due = await db.listDueVariants(new Date().toISOString());
  const results: { id: string; status: string; error?: string }[] = [];

  for (const variant of due) {
    if (variant.retry_count >= MAX_RETRIES) {
      await db.updateVariant(variant.id, { status: "failed" });
      results.push({ id: variant.id, status: "gave-up" });
      continue;
    }
    const adapter = PUBLISH_ADAPTERS[variant.platform];
    await db.updateVariant(variant.id, { status: "posting" });
    const r = await adapter.publish(variant);
    if (r.externalId) {
      await db.updateVariant(variant.id, {
        status: "posted",
        external_id: r.externalId,
        posted_at: new Date().toISOString(),
        error: null,
      });
      results.push({ id: variant.id, status: "posted" });
    } else {
      await db.updateVariant(variant.id, {
        status: r.manual ? "ready" : "scheduled", // keep scheduled for retry
        error: r.error ?? "unknown",
        retry_count: variant.retry_count + (r.manual ? 0 : 1),
      });
      results.push({ id: variant.id, status: "retry", error: r.error });
    }
  }

  return Response.json({ processed: due.length, results });
}
