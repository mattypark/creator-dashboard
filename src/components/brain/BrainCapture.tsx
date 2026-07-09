"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { downscaleImage } from "@/lib/downscale-image";
import type { MetricPlatform } from "@/lib/types";

const PLATFORMS: MetricPlatform[] = ["x", "youtube", "linkedin", "instagram", "tiktok"];

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

type ImageAction = "inspiration" | "analytics" | "ideas";

const IMAGE_ACTIONS: { value: ImageAction; label: string }[] = [
  { value: "inspiration", label: "Save as inspiration (AI titles + tags)" },
  { value: "analytics", label: "Read analytics screenshots → metrics" },
  { value: "ideas", label: "Turn into content ideas → pipeline" },
];

type Img = { base64: string; mediaType: string; name: string };

type Props = {
  onCaptured: () => void;
  flash: (message: string) => void;
};

export function BrainCapture({ onCaptured, flash }: Props) {
  const [value, setValue] = useState("");
  const [images, setImages] = useState<Img[]>([]);
  const [action, setAction] = useState<ImageAction>("inspiration");
  const [platform, setPlatform] = useState<MetricPlatform | "">("");
  const [isBusy, setIsBusy] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function attachFiles(files: Iterable<File>) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const loaded = await Promise.all(
      list.map(async (file) => {
        const { base64, mediaType } = await downscaleImage(file);
        return { base64, mediaType, name: file.name };
      }),
    );
    if (loaded.length) setImages((prev) => [...prev, ...loaded]);
  }

  async function submitOneImage(img: Img): Promise<string | null> {
    const endpoint = action === "analytics" ? "/api/ingest-metrics" : "/api/vision-capture";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: img.base64,
        mediaType: img.mediaType,
        action,
        platform: platform || undefined, // hint for analytics when auto-detect fails
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return data.needsKey ? "needs ANTHROPIC_API_KEY" : data.error || "failed";
    }
    return null;
  }

  async function enter() {
    if (!value.trim() && images.length === 0) return;
    setIsBusy(true);
    try {
      if (images.length > 0) {
        let ok = 0;
        let firstError: string | null = null;
        for (const img of images) {
          const err = await submitOneImage(img);
          if (err) firstError ??= err;
          else ok++;
        }
        if (ok === images.length) {
          flash(
            images.length === 1
              ? "Image processed"
              : `${ok} images processed`,
          );
        } else {
          flash(`${ok}/${images.length} images processed — ${firstError}`);
        }
        setImages([]);
      }
      if (value.trim()) {
        const payload = toPayload(value);
        const res = await fetch("/api/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setValue("");
          flash("url" in payload ? "Link captured" : "Note captured");
        } else {
          flash("Capture failed");
        }
      }
      onCaptured();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        attachFiles(e.dataTransfer.files);
      }}
      className={`card p-3 flex flex-col gap-2 transition-[border-color,box-shadow] duration-300 ease-lux ${
        isDragOver
          ? "!border-[var(--mango)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--mango)_15%,transparent)]"
          : ""
      }`}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") enter();
        }}
        onPaste={(e) => {
          if (e.clipboardData.files.length > 0) {
            e.preventDefault();
            attachFiles(e.clipboardData.files);
          }
        }}
        placeholder="Paste a link, thought, or images — or drag & drop them here. ⌘↵ to enter."
        rows={2}
        className="w-full bg-transparent resize-none outline-none text-sm placeholder:text-[var(--muted)]"
      />

      {images.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2">
          <div className="flex flex-wrap gap-2">
            {images.map((img, i) => (
              <div key={`${img.name}-${i}`} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:${img.mediaType};base64,${img.base64}`}
                  alt=""
                  className="h-14 w-14 rounded-md object-cover border border-[var(--border)]"
                />
                <button
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-[var(--foreground)] text-[var(--background)] p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as ImageAction)}
              className="flex-1 min-w-48 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs outline-none"
            >
              {IMAGE_ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label} {images.length > 1 ? `— all ${images.length} images` : ""}
                </option>
              ))}
            </select>
            {action === "analytics" && (
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as MetricPlatform | "")}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs outline-none"
                title="Which platform is this screenshot from?"
              >
                <option value="">Auto-detect platform</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <ImagePlus size={13} /> Add images
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) attachFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <span className="text-[11px] text-[var(--muted)] hidden sm:inline">
            Links auto-fill. Images go through AI — drop as many as you want.
          </span>
        </div>
        <button
          onClick={enter}
          disabled={isBusy || (!value.trim() && images.length === 0)}
          className="btn-minted rounded-lg px-4 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          {isBusy ? "Entering…" : "Enter"}
        </button>
      </div>
    </div>
  );
}
