import { PUBLISH_ADAPTERS } from "@/lib/adapters/publish";
import { getDb } from "@/lib/db";
import type { Platform } from "@/lib/types";

/**
 * Publish now. Two shapes:
 *   { variantId }                  -> publish an existing variant
 *   { scriptId, platform, body }   -> create a variant, then publish it
 *
 * Marks posting -> posted (with external_id) on success, failed (with error)
 * otherwise. Idempotent: a variant that already has external_id is skipped.
 */
export async function POST(request: Request) {
  const db = getDb();
  const payload = await request.json();

  let variant;
  if (payload.variantId) {
    const variants = await db.listVariants();
    variant = variants.find((v) => v.id === payload.variantId);
    if (!variant) return Response.json({ error: "not found" }, { status: 404 });
  } else if (payload.scriptId && payload.platform) {
    variant = await db.createVariant({
      script_id: payload.scriptId,
      platform: payload.platform as Platform,
      body: payload.body ?? "",
      status: "ready",
    });
  } else {
    return Response.json(
      { error: "provide variantId, or scriptId + platform" },
      { status: 400 },
    );
  }

  if (variant.external_id)
    return Response.json({ variant, skipped: "already posted" });

  const adapter = PUBLISH_ADAPTERS[variant.platform];
  await db.updateVariant(variant.id, { status: "posting" });
  const result = await adapter.publish(variant);

  if (result.externalId) {
    const updated = await db.updateVariant(variant.id, {
      status: "posted",
      external_id: result.externalId,
      posted_at: new Date().toISOString(),
      error: null,
    });
    return Response.json({ variant: updated });
  }

  const updated = await db.updateVariant(variant.id, {
    status: result.manual ? "ready" : "failed",
    error: result.error ?? "unknown error",
    retry_count: variant.retry_count + (result.manual ? 0 : 1),
  });
  return Response.json(
    { variant: updated, manual: result.manual ?? false, error: result.error },
    { status: result.manual ? 200 : 502 },
  );
}
