import { getDb } from "@/lib/db";
import type { AudienceProfile } from "@/lib/types";

export async function GET() {
  const db = getDb();
  const profiles = await db.listAudience();
  return Response.json({ mode: db.mode, profiles });
}

/** Upsert one platform's audience profile (gender/age/geo/active_hours). */
export async function POST(request: Request) {
  const db = getDb();
  const body = (await request.json().catch(() => ({}))) as Partial<AudienceProfile>;
  if (!body.platform)
    return Response.json({ error: "platform required" }, { status: 400 });
  const profile = await db.upsertAudience({
    platform: body.platform,
    gender: body.gender ?? [],
    age: body.age ?? [],
    geo: body.geo ?? [],
    active_hours: body.active_hours ?? [],
    updated_at: new Date().toISOString(),
  });
  return Response.json({ profile });
}
