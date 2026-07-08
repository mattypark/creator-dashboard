"use client";

import { useState } from "react";
import { PLATFORM_META, type Platform } from "@/lib/types";

type Props = {
  platform: Platform;
  text: string;
  scriptId: string;
  flash: (message: string) => void;
};

export function VariantBlock({ platform, text, scriptId, flash }: Props) {
  const meta = PLATFORM_META[platform];
  const [isBusy, setIsBusy] = useState(false);

  async function handlePublish() {
    setIsBusy(true);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId, platform, body: text }),
      });
      const data = await res.json();
      if (data.variant?.status === "posted") {
        flash(`Posted to ${meta.label}`);
      } else {
        flash(data.error || `${meta.label}: not posted`);
      }
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="border border-[var(--border)] rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: meta.color }}
          />
          <span className="text-xs font-semibold">{meta.label}</span>
          {!meta.autoPost && (
            <span className="text-[10px] text-[var(--muted)]">manual</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(text);
              flash("Copied");
            }}
            className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            copy
          </button>
          {meta.autoPost && (
            <button
              onClick={handlePublish}
              disabled={isBusy}
              className="text-[10px] text-indigo-300 hover:text-indigo-200 disabled:opacity-50"
            >
              {isBusy ? "…" : "publish"}
            </button>
          )}
        </div>
      </div>
      <p className="text-xs whitespace-pre-wrap text-[var(--foreground)]/90">
        {text}
      </p>
    </div>
  );
}
