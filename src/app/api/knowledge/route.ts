import { fetchMetadata } from "@/lib/adapters/ingest";
import { getDb } from "@/lib/db";
import type { KnowledgeStatus } from "@/lib/types";

export async function GET(request: Request) {
  const db = getDb();
  const status = new URL(request.url).searchParams.get("status") as
    | KnowledgeStatus
    | null;
  const items = await db.listKnowledge(status ?? undefined);
  return Response.json({ mode: db.mode, items });
}

/**
 * Capture an item. Two shapes:
 *  - { url }  -> keyless metadata fetch fills title/thumbnail, then stored.
 *  - { text } -> a raw note / brain dump (kind "note"), no fetch.
 * A bare object is stored as-is (used by internal callers like imports).
 */
export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json().catch(() => ({}));

  if (typeof body.url === "string" && body.url.trim()) {
    const meta = await fetchMetadata(body.url.trim());
    const item = await db.createKnowledge({
      kind: meta.kind,
      url: meta.url,
      title: meta.title,
      image_url: meta.image_url,
      author: meta.author,
      source_platform: meta.source_platform,
      raw_text: meta.raw_text,
      tags: Array.isArray(body.tags) ? body.tags : [],
      status: "inbox",
    });
    return Response.json({ item }, { status: 201 });
  }

  if (typeof body.text === "string" && body.text.trim()) {
    const text = body.text.trim();
    const item = await db.createKnowledge({
      kind: "note",
      title: text.slice(0, 60),
      raw_text: text,
      tags: Array.isArray(body.tags) ? body.tags : [],
      status: "inbox",
    });
    return Response.json({ item }, { status: 201 });
  }

  const item = await db.createKnowledge(body);
  return Response.json({ item }, { status: 201 });
}

export async function PATCH(request: Request) {
  const db = getDb();
  const { id, ...patch } = await request.json();
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const item = await db.updateKnowledge(id, patch);
  if (!item) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ item });
}

export async function DELETE(request: Request) {
  const db = getDb();
  const { id } = await request.json();
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  await db.deleteKnowledge(id);
  return Response.json({ ok: true });
}
