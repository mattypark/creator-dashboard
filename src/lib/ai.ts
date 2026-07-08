import Anthropic from "@anthropic-ai/sdk";
import type { Platform } from "./types";
import { PLATFORM_META } from "./types";

// Cheapest capable model — fine for scripting, summaries, ideas, and vision
// extraction. Override with ANTHROPIC_MODEL env if you ever want more power.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

export class AINotConfiguredError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set. Add it to .env.local to enable AI.");
    this.name = "AINotConfiguredError";
  }
}

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new AINotConfiguredError();
  if (!_client) _client = new Anthropic();
  return _client;
}

async function complete(system: string, user: string, maxTokens = 1024) {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/** Like complete(), but coerces the reply into a JSON object of shape T. */
async function completeJson<T>(
  system: string,
  user: string,
  maxTokens = 800,
): Promise<T> {
  const raw = await complete(
    system + " Respond ONLY with valid minified JSON, no prose or code fences.",
    user,
    maxTokens,
  );
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI did not return JSON");
  return JSON.parse(raw.slice(start, end + 1)) as T;
}

/** Turn a rough thought into a structured first-draft script. */
export function draftScript(thought: string) {
  return complete(
    "You are a sharp content strategist. Turn the user's rough idea into a tight, " +
      "well-structured short-form video script: a hook, 2-4 beats, and a closing CTA. " +
      "Keep it punchy. Plain text, no markdown headers.",
    thought,
    1200,
  );
}

/** Generate per-platform captions from one source script. */
export async function repurpose(
  script: string,
  platforms: Platform[],
): Promise<Record<Platform, string>> {
  const out = {} as Record<Platform, string>;
  await Promise.all(
    platforms.map(async (p) => {
      const guide: Record<Platform, string> = {
        x: "a single punchy tweet under 280 chars, 1-2 relevant hashtags max",
        linkedin:
          "a LinkedIn post: a strong first line, short paragraphs, a reflective insight, light professional tone",
        instagram:
          "an Instagram caption: engaging first line, line breaks, 5-10 hashtags at the end",
        tiktok:
          "a TikTok caption: short, casual, trend-aware, 3-5 hashtags",
      };
      out[p] = await complete(
        `You rewrite a source script into a ${PLATFORM_META[p].label} post. ` +
          `Format it as ${guide[p]}. Return only the post text.`,
        script,
        600,
      );
    }),
  );
  return out;
}

/** Expand a quick thought into 3-5 distinct content ideas. */
export function ideasFromThought(thought: string) {
  return complete(
    "You are a content idea machine. Given a rough thought, return 3-5 distinct, " +
      "specific content ideas as a plain numbered list. Each one line.",
    thought,
    600,
  );
}

export interface ExtractedAnalytics {
  platform: string | null;
  followers: number | null;
  views: number | null;
  engagement: number | null; // percent, e.g. 8.4
  gender: { label: string; pct: number }[];
  age: { label: string; pct: number }[];
  geo: { label: string; pct: number }[];
  active_hours: number[]; // up to 24 values, share of activity per hour
  top_posts: { title: string; views: number }[];
}

const EXTRACT_PROMPT =
  "You are reading a screenshot of a creator's social-media analytics dashboard " +
  "(X, YouTube, Instagram, TikTok, or LinkedIn insights). Extract what is visible. " +
  "Return ONLY minified JSON of this exact shape (use null / [] when a field is not " +
  'shown, numbers as plain integers not strings): {"platform": string|null, ' +
  '"followers": number|null, "views": number|null, "engagement": number|null, ' +
  '"gender": [{"label": string, "pct": number}], "age": [{"label": string, "pct": number}], ' +
  '"geo": [{"label": string, "pct": number}], "active_hours": number[], ' +
  '"top_posts": [{"title": string, "views": number}]}. ' +
  "active_hours is a 24-length array (hour 0..23) of relative audience activity if a " +
  "when-your-followers-are-active chart is shown, else []. Do not invent data.";

/** Vision: pull structured analytics out of an uploaded screenshot. */
export async function extractAnalytics(
  imageBase64: string,
  mediaType: string,
): Promise<ExtractedAnalytics> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/png" | "image/jpeg" | "image/webp",
              data: imageBase64,
            },
          },
          { type: "text", text: EXTRACT_PROMPT },
        ],
      },
    ],
  });
  const raw = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Vision did not return JSON");
  return JSON.parse(raw.slice(start, end + 1)) as ExtractedAnalytics;
}

type ImageBlock = {
  type: "image";
  source: { type: "base64"; media_type: "image/png" | "image/jpeg" | "image/webp"; data: string };
};

function imageBlock(imageBase64: string, mediaType: string): ImageBlock {
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: mediaType as ImageBlock["source"]["media_type"],
      data: imageBase64,
    },
  };
}

async function visionComplete(
  imageBase64: string,
  mediaType: string,
  prompt: string,
  maxTokens = 800,
): Promise<string> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [
      {
        role: "user",
        content: [imageBlock(imageBase64, mediaType), { type: "text", text: prompt }],
      },
    ],
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/** Vision: title/summary/tags for an inspiration image saved to the brain. */
export async function describeImage(
  imageBase64: string,
  mediaType: string,
): Promise<{ title: string; summary: string; tags: string[] }> {
  const raw = await visionComplete(
    imageBase64,
    mediaType,
    "You are a research librarian for a content creator. Describe this saved " +
      "inspiration image: a short title (max 8 words), a 1-2 sentence summary of " +
      "what it shows and why it might be useful for content, and 2-5 short " +
      'lowercase tags. Respond ONLY with minified JSON: {"title": string, ' +
      '"summary": string, "tags": string[]}.',
    400,
  );
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Vision did not return JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

/** Vision: turn an image into 3-5 concrete content ideas. */
export function ideasFromImage(imageBase64: string, mediaType: string): Promise<string> {
  return visionComplete(
    imageBase64,
    mediaType,
    "You are a content idea machine. Based on what this image shows, return 3-5 " +
      "distinct, specific content ideas as a plain numbered list. Each one line.",
    600,
  );
}

/** Summarize a captured item and suggest tags. Cheap, one call. */
export function summarizeCapture(input: {
  title?: string | null;
  url?: string | null;
  rawText?: string | null;
}): Promise<{ summary: string; tags: string[] }> {
  const user = [
    input.title ? `Title: ${input.title}` : "",
    input.url ? `URL: ${input.url}` : "",
    input.rawText ? `Content: ${input.rawText.slice(0, 2000)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return completeJson<{ summary: string; tags: string[] }>(
    "You are a research librarian for a content creator. Summarize the captured " +
      "item in 1-2 sentences and suggest 2-5 short lowercase topic tags. " +
      'JSON shape: {"summary": string, "tags": string[]}.',
    user,
    400,
  );
}

/** Find which candidate items relate to a given item. Approximate, no vectors. */
export function findConnections(
  item: { id: string; title: string; summary?: string | null },
  candidates: { id: string; title: string; summary?: string | null }[],
): Promise<{ connections: { target_id: string; reason: string }[] }> {
  const list = candidates
    .map((c) => `- id=${c.id} :: ${c.title}${c.summary ? ` — ${c.summary}` : ""}`)
    .join("\n");
  return completeJson<{ connections: { target_id: string; reason: string }[] }>(
    "You link related pieces of content research. Given a source item and a list " +
      "of candidates, return only the candidates that meaningfully connect to the " +
      "source (shared theme, contrast, or build-on). Use exact candidate ids. " +
      'JSON shape: {"connections": [{"target_id": string, "reason": string}]}. ' +
      "Return an empty array if none genuinely connect.",
    `SOURCE: ${item.title}${item.summary ? ` — ${item.summary}` : ""}\n\nCANDIDATES:\n${list}`,
    700,
  );
}

/** Propose content ideas grounded in recent captures. */
export function ideasFromKnowledge(
  items: { id: string; title: string; summary?: string | null }[],
): Promise<{ ideas: { title: string; body: string; source_item_ids: string[] }[] }> {
  const list = items
    .map((i) => `- id=${i.id} :: ${i.title}${i.summary ? ` — ${i.summary}` : ""}`)
    .join("\n");
  return completeJson<{
    ideas: { title: string; body: string; source_item_ids: string[] }[];
  }>(
    "You are a content strategist. From the creator's recent saved research, " +
      "propose 2-4 specific content ideas they could make. Ground each idea in the " +
      "items that inspired it (use exact ids). Keep bodies to 1-2 sentences. " +
      'JSON shape: {"ideas": [{"title": string, "body": string, "source_item_ids": string[]}]}.',
    `RECENT CAPTURES:\n${list}`,
    900,
  );
}
