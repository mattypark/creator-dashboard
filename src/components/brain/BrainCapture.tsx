"use client";

import { useState } from "react";

/** Decide whether the pasted text is a URL or a raw thought. */
function toPayload(input: string): { url: string } | { text: string } {
  const trimmed = input.trim();
  const hasWhitespace = /\s/.test(trimmed);
  if (!hasWhitespace) {
    if (/^https?:\/\//i.test(trimmed)) return { url: trimmed };
    // bare domain like youtube.com/watch?v=… → assume https
    if (/^[\w-]+(\.[\w-]+)+(\/|$|\?)/.test(trimmed)) return { url: `https://${trimmed}` };
  }
  return { text: trimmed };
}

type Props = {
  onCaptured: () => void;
  flash: (message: string) => void;
};

export function BrainCapture({ onCaptured, flash }: Props) {
  const [value, setValue] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function capture() {
    if (!value.trim()) return;
    setIsBusy(true);
    try {
      const payload = toPayload(value);
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        flash("Capture failed");
        return;
      }
      setValue("");
      onCaptured();
      flash("url" in payload ? "Link captured" : "Note captured");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") capture();
        }}
        placeholder="Paste a link, tweet, or video — or dump a raw thought. ⌘↵ to save."
        rows={2}
        className="w-full bg-transparent resize-none outline-none text-sm placeholder:text-[var(--muted)]"
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[var(--muted)]">
          Links auto-fill title + thumbnail. No keys needed.
        </span>
        <button
          onClick={capture}
          disabled={isBusy || !value.trim()}
          className="text-xs bg-[var(--mango)] text-white rounded-lg px-3 py-1.5 hover:brightness-105 disabled:opacity-50"
        >
          {isBusy ? "Capturing…" : "Capture"}
        </button>
      </div>
    </div>
  );
}
