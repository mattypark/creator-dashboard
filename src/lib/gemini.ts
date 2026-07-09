/**
 * Optional Gemini pre-pass for the screenshot-ingest pipeline.
 *
 * When GEMINI_API_KEY is set, gemini-2.5-flash-lite transcribes every legible
 * number/label/chart value on the screenshot into plain structured text, which
 * Claude (Haiku) then normalizes into the ExtractedAnalytics JSON schema.
 * Plain REST via fetch — no SDK dependency. Never throws: any failure returns
 * null so callers fall back silently to the single-pass Claude vision path.
 */

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const TRANSCRIBE_PROMPT =
  "Transcribe EVERY number, label, chart value, and piece of text you can see " +
  "on this social-media analytics screenshot, exhaustively, as plain structured " +
  "text. Keep related values grouped (e.g. one line per post row with all of its " +
  "stats; demographic bars with their percentages; chart axes with their values). " +
  "Include headline stats (followers, following, views, engagement, profile " +
  "visits, reach), per-post stats (views, likes, comments, shares, saves, dates), " +
  "and audience breakdowns. Do not summarize, do not interpret, do not invent — " +
  "only transcribe what is legible.";

interface GeminiPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
}

/**
 * Transcribe an analytics screenshot to exhaustive plain text.
 * Returns null when GEMINI_API_KEY is unset or the call fails for any reason.
 */
export async function transcribeScreenshot(
  imageBase64: string,
  mimeType: string,
): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
              { text: TRANSCRIBE_PROMPT },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as GeminiResponse;
    const text = (json.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("")
      .trim();
    return text || null;
  } catch {
    return null; // network/parse failure -> silent fallback to Claude vision
  }
}
