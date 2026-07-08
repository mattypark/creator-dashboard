"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import type { MetricPlatform } from "@/lib/types";

const PLATFORMS: MetricPlatform[] = ["x", "youtube", "linkedin", "instagram", "tiktok"];

type Props = {
  onIngested: () => void;
  flash: (message: string) => void;
};

/** Upload an analytics screenshot -> vision extracts metrics into the app. */
export function MetricsUpload({ onIngested, flash }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [platform, setPlatform] = useState<MetricPlatform | "">("");
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const base64 = await toBase64(file);
      const res = await fetch("/api/ingest-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: file.type || "image/png",
          platform: platform || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash(
          data.needsKey
            ? "Add ANTHROPIC_API_KEY to read screenshots"
            : data.error || "Ingest failed",
        );
        return;
      }
      flash(`Read ${data.platform}: ${data.wrote.join(", ") || "nothing found"}`);
      onIngested();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-xl border border-[var(--blueberry)]/30 bg-[var(--blueberry)]/5 p-4 flex flex-col gap-3">
      <div>
        <p className="kicker text-[var(--blueberry)]">Upload analytics</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Drop a screenshot of any platform&apos;s insights — followers, views,
          demographics, active hours, and top posts get read automatically.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as MetricPlatform | "")}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm outline-none"
        >
          <option value="">Auto-detect platform</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--blueberry)] px-3 py-1.5 text-sm font-medium text-white hover:brightness-105 disabled:opacity-50"
        >
          <Upload size={14} /> {busy ? "Reading…" : "Upload screenshot"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>
    </div>
  );
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
