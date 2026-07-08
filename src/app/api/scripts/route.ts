import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const scripts = await db.listScripts();
  return Response.json({ mode: db.mode, scripts });
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json().catch(() => ({}));
  const script = await db.createScript(body);
  return Response.json({ script }, { status: 201 });
}

export async function PATCH(request: Request) {
  const db = getDb();
  const { id, ...patch } = await request.json();
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const script = await db.updateScript(id, patch);
  if (!script) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ script });
}

export async function DELETE(request: Request) {
  const db = getDb();
  const { id } = await request.json();
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  await db.deleteScript(id);
  return Response.json({ ok: true });
}
