import { getDb } from "@/lib/db";
import type { SuggestionStatus } from "@/lib/types";

export async function GET(request: Request) {
  const db = getDb();
  const status = new URL(request.url).searchParams.get("status") as
    | SuggestionStatus
    | null;
  const suggestions = await db.listSuggestions(status ?? undefined);
  return Response.json({ mode: db.mode, suggestions });
}

export async function PATCH(request: Request) {
  const db = getDb();
  const { id, ...patch } = await request.json();
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const suggestion = await db.updateSuggestion(id, patch);
  if (!suggestion) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ suggestion });
}
