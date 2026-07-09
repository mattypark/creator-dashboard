"use client";

import { useState } from "react";
import type { MetricPlatform } from "@/lib/types";

const PLATFORMS: MetricPlatform[] = ["x", "youtube", "linkedin", "instagram", "tiktok"];

type Props = {
  onAdded: () => void;
  flash: (message: string) => void;
};

/** Manually log one post's metrics (per-post tracking). */
export function PostEntry({ onAdded, flash }: Props) {
  const [platform, setPlatform] = useState<MetricPlatform>("x");
  const [title, setTitle] = useState("");
  const [views, setViews] = useState("");
  const [likes, setLikes] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          title: title.trim(),
          views: Number(views) || 0,
          likes: Number(likes) || 0,
        }),
      });
      setTitle("");
      setViews("");
      setLikes("");
      onAdded();
      flash("Post logged");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4 flex flex-col gap-3">
      <p className="kicker">Log a post</p>
      <div className="flex flex-wrap gap-2">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as MetricPlatform)}
          className="input-engraved rounded-lg px-2 py-1.5 text-sm outline-none"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title / description"
          className="input-engraved flex-1 min-w-40 rounded-lg px-3 py-1.5 text-sm outline-none"
        />
        <input
          value={views}
          onChange={(e) => setViews(e.target.value)}
          inputMode="numeric"
          placeholder="views"
          className="input-engraved w-24 rounded-lg px-2 py-1.5 text-sm outline-none"
        />
        <input
          value={likes}
          onChange={(e) => setLikes(e.target.value)}
          inputMode="numeric"
          placeholder="likes"
          className="input-engraved w-24 rounded-lg px-2 py-1.5 text-sm outline-none"
        />
        <button
          onClick={add}
          disabled={busy || !title.trim()}
          className="btn-minted rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {busy ? "…" : "Add"}
        </button>
      </div>
    </div>
  );
}
