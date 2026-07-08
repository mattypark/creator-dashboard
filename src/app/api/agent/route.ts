import { fetchMetadata } from "@/lib/adapters/ingest";
import {
  AINotConfiguredError,
  findConnections,
  ideasFromKnowledge,
  summarizeCapture,
} from "@/lib/ai";
import { getDb } from "@/lib/db";
import type { KnowledgeItem } from "@/lib/types";

// Bounds — cost levers. Kept small so a run is cheap at solo volume.
const MAX_BACKFILL = 8;
const MAX_SUMMARIZE = 5;
const MAX_CANDIDATES = 20;
const RECENT_FOR_IDEAS = 12;

/**
 * The proactive brain pass. Its own route (never the publish cron) so slow,
 * expensive AI work stays off the fast posting path.
 *
 * GET  — scheduled trigger, guarded by CRON_SECRET when set.
 * POST — manual "Run agent now" from the UI (open, like the other routes).
 *
 * Degrades keyless: without ANTHROPIC_API_KEY only the oEmbed/OG backfill runs.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`)
      return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return runAgent();
}

export async function POST() {
  return runAgent();
}

async function runAgent() {
  const db = getDb();

  // (1) Keyless metadata backfill — fill missing thumbnails/titles via oEmbed/OG.
  const all = await db.listKnowledge();
  const needsMeta = all
    .filter((k) => k.url && !k.image_url && k.kind !== "note")
    .slice(0, MAX_BACKFILL);
  let backfilled = 0;
  for (const item of needsMeta) {
    const meta = await fetchMetadata(item.url!);
    if (meta.image_url || (meta.title && meta.title !== item.title)) {
      await db.updateKnowledge(item.id, {
        title: meta.title || item.title,
        image_url: meta.image_url ?? item.image_url,
        author: meta.author ?? item.author,
      });
      backfilled++;
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ ai: false, backfilled });
  }

  try {
    // (2) Summarize inbox items lacking a summary.
    const inbox = all
      .filter((k) => k.status === "inbox" && !k.summary)
      .slice(0, MAX_SUMMARIZE);
    const summarized: KnowledgeItem[] = [];
    for (const item of inbox) {
      const { summary, tags } = await summarizeCapture({
        title: item.title,
        url: item.url,
        rawText: item.raw_text,
      });
      const merged = Array.from(new Set([...item.tags, ...tags]));
      const updated = await db.updateKnowledge(item.id, {
        summary,
        tags: merged,
        status: "processed",
      });
      if (updated) summarized.push(updated);
    }

    // (3) Connect each freshly-summarized item to existing processed items.
    const processed = (await db.listKnowledge()).filter(
      (k) => k.status === "processed" || k.status === "promoted",
    );
    let edges = 0;
    for (const item of summarized) {
      const candidates = processed
        .filter((c) => c.id !== item.id)
        .slice(0, MAX_CANDIDATES)
        .map((c) => ({ id: c.id, title: c.title, summary: c.summary }));
      if (candidates.length === 0) continue;
      const { connections } = await findConnections(
        { id: item.id, title: item.title, summary: item.summary },
        candidates,
      );
      const valid = new Set(candidates.map((c) => c.id));
      for (const c of connections) {
        if (!valid.has(c.target_id)) continue;
        await db.createEdge({
          source_id: item.id,
          target_id: c.target_id,
          reason: c.reason,
        });
        edges++;
      }
    }

    // (4) Propose ideas from recent research.
    const recent = processed
      .filter((k) => k.summary)
      .slice(0, RECENT_FOR_IDEAS)
      .map((k) => ({ id: k.id, title: k.title, summary: k.summary }));
    let suggestions = 0;
    if (recent.length > 0) {
      const validIds = new Set(recent.map((r) => r.id));
      const { ideas } = await ideasFromKnowledge(recent);
      for (const idea of ideas) {
        await db.createSuggestion({
          kind: "idea",
          title: idea.title,
          body: idea.body,
          source_item_ids: (idea.source_item_ids ?? []).filter((id) =>
            validIds.has(id),
          ),
          status: "new",
        });
        suggestions++;
      }
    }

    return Response.json({
      ai: true,
      backfilled,
      summarized: summarized.length,
      edges,
      suggestions,
    });
  } catch (e) {
    if (e instanceof AINotConfiguredError)
      return Response.json({ ai: false, backfilled });
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
