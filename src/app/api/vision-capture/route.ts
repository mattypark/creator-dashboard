import { AINotConfiguredError, describeImage, ideasFromImage } from "@/lib/ai";
import { getDb } from "@/lib/db";

/**
 * Image capture with an AI action:
 *  - "inspiration": vision titles/summarizes/tags it -> saved to the brain
 *    (keyless: still saved, just untitled).
 *  - "ideas": vision generates content ideas -> lands as an idea script
 *    on the pipeline (needs key).
 * Body: { imageBase64, mediaType, action }.
 * Analytics screenshots go to /api/ingest-metrics instead.
 */
export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json().catch(() => ({}));
  if (!body.imageBase64)
    return Response.json({ error: "imageBase64 required" }, { status: 400 });
  const mediaType = body.mediaType || "image/png";
  const dataUrl = `data:${mediaType};base64,${body.imageBase64}`;

  try {
    if (body.action === "ideas") {
      const ideas = await ideasFromImage(body.imageBase64, mediaType);
      const script = await db.createScript({
        title: "Ideas from image",
        body: ideas,
        status: "idea",
      });
      return Response.json({ ok: true, kind: "script", script });
    }

    // Default: save as inspiration in the brain.
    let title = "Image capture";
    let summary: string | null = null;
    let tags: string[] = [];
    let ai = false;
    try {
      const described = await describeImage(body.imageBase64, mediaType);
      title = described.title || title;
      summary = described.summary || null;
      tags = described.tags ?? [];
      ai = true;
    } catch (e) {
      if (!(e instanceof AINotConfiguredError)) throw e;
      // keyless: save the image without AI enrichment
    }
    const item = await db.createKnowledge({
      kind: "note",
      title,
      summary,
      tags,
      image_url: dataUrl,
      status: ai ? "processed" : "inbox",
    });
    return Response.json({ ok: true, kind: "knowledge", ai, item });
  } catch (e) {
    if (e instanceof AINotConfiguredError)
      return Response.json({ error: e.message, needsKey: true }, { status: 503 });
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
