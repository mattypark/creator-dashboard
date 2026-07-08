import { AINotConfiguredError, draftScript, ideasFromThought, repurpose } from "@/lib/ai";
import { AUTO_POST_PLATFORMS, type Platform } from "@/lib/types";

export async function POST(request: Request) {
  const { action, text, platforms } = await request.json();
  try {
    switch (action) {
      case "draft":
        return Response.json({ result: await draftScript(text) });
      case "ideas":
        return Response.json({ result: await ideasFromThought(text) });
      case "repurpose": {
        const targets: Platform[] =
          Array.isArray(platforms) && platforms.length
            ? platforms
            : (["x", "linkedin", "instagram", "tiktok"] as Platform[]);
        return Response.json({ variants: await repurpose(text, targets) });
      }
      default:
        return Response.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof AINotConfiguredError)
      return Response.json({ error: e.message, needsKey: true }, { status: 503 });
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET() {
  // Lets the UI know which platforms auto-post.
  return Response.json({ autoPost: AUTO_POST_PLATFORMS });
}
