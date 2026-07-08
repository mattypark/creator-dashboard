import { getDb } from "@/lib/db";
import type { MetricPlatform } from "@/lib/types";

export async function GET(request: Request) {
  const db = getDb();
  const platform = new URL(request.url).searchParams.get("platform") as
    | MetricPlatform
    | null;
  const posts = await db.listPosts(platform ?? undefined);
  return Response.json({ mode: db.mode, posts });
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json().catch(() => ({}));
  if (!body.platform)
    return Response.json({ error: "platform required" }, { status: 400 });
  const post = await db.createPost(body);
  return Response.json({ post }, { status: 201 });
}

export async function PATCH(request: Request) {
  const db = getDb();
  const { id, ...patch } = await request.json();
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const post = await db.updatePost(id, patch);
  if (!post) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ post });
}

export async function DELETE(request: Request) {
  const db = getDb();
  const { id } = await request.json();
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  await db.deletePost(id);
  return Response.json({ ok: true });
}
