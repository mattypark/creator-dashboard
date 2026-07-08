import type { Platform, PostVariant } from "../types";

export interface PublishResult {
  externalId?: string;
  error?: string;
  /** true when the platform can't auto-post yet (IG/TikTok) — user does it manually. */
  manual?: boolean;
}

export interface PublishAdapter {
  platform: Platform;
  autoPost: boolean;
  publish(variant: PostVariant): Promise<PublishResult>;
}

// --- X / Twitter (API v2) -------------------------------------------------
const xAdapter: PublishAdapter = {
  platform: "x",
  autoPost: true,
  async publish(variant) {
    const token = process.env.X_BEARER_TOKEN;
    if (!token)
      return { error: "X not configured (set X_BEARER_TOKEN). Verify your API tier." };
    try {
      const res = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: variant.body }),
      });
      const json = await res.json();
      if (!res.ok)
        return { error: json?.detail || json?.title || `X error ${res.status}` };
      return { externalId: json?.data?.id };
    } catch (e) {
      return { error: (e as Error).message };
    }
  },
};

// --- LinkedIn (requires approved app + w_member_social) -------------------
const linkedinAdapter: PublishAdapter = {
  platform: "linkedin",
  autoPost: true,
  async publish(variant) {
    const token = process.env.LINKEDIN_ACCESS_TOKEN;
    const author = process.env.LINKEDIN_AUTHOR_URN; // e.g. "urn:li:person:xxxx"
    if (!token || !author)
      return {
        error:
          "LinkedIn not configured (set LINKEDIN_ACCESS_TOKEN + LINKEDIN_AUTHOR_URN). Requires an approved app.",
      };
    try {
      const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: variant.body },
              shareMediaCategory: "NONE",
            },
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
          },
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        return { error: `LinkedIn error ${res.status}: ${txt.slice(0, 200)}` };
      }
      const id = res.headers.get("x-restli-id") ?? undefined;
      return { externalId: id };
    } catch (e) {
      return { error: (e as Error).message };
    }
  },
};

// --- Instagram / TikTok: manual handoff until access clears ---------------
function manualAdapter(platform: Platform): PublishAdapter {
  return {
    platform,
    autoPost: false,
    async publish() {
      return {
        manual: true,
        error:
          `${platform} auto-post not enabled yet. Caption is ready — copy it and post manually, ` +
          `then mark the variant as posted.`,
      };
    },
  };
}

export const PUBLISH_ADAPTERS: Record<Platform, PublishAdapter> = {
  x: xAdapter,
  linkedin: linkedinAdapter,
  instagram: manualAdapter("instagram"),
  tiktok: manualAdapter("tiktok"),
};
