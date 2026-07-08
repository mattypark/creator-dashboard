"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

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
  { value: "inspiration", label: "Save as inspiration (AI titles + tags it)" },
  { value: "analytics", label: "Read analytics screenshot → metrics" },
  { value: "ideas", label: "Turn into content ideas → pipeline" },
];

type Props = {
  onCaptured: () => void;
  flash: (message: string) => void;
};

export function BrainCapture({ onCaptured, flash }: Props) {
  const [value, setValue] = useState("");
  const [image, setImage] = useState<{ base64: string; mediaType: string; name: string } | null>(null);
  const [action, setAction] = useState<ImageAction>("inspiration");
  const [isBusy, setIsBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function attachFile(file: File) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setImage({ base64, mediaType: file.type || "image/png", name: file.name });
  }

  async function submitImage() {
    if (!image) return;
    const endpoint = action === "analytics" ? "/api/ingest-metrics" : "/api/vision-capture";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: image.base64,
        mediaType: image.mediaType,
        action,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.needsKey ? "Add ANTHROPIC_API_KEY for AI image reading" : data.error || "Failed");
      return;
    }
    if (action === "analytics") {
      flash(`Read ${data.platform}: ${(data.wrote ?? []).join(", ") || "nothing found"}`);
    } else if (data.kind === "script") {
      flash("Ideas added to pipeline");
    } else {
      flash(data.ai ? "Image saved + tagged" : "Image saved (add a key for AI tagging)");
    }
    setImage(null);
  }

  async function submitText() {
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
    flash("url" in payload ? "Link captured" : "Note captured");
  }

  async function enter() {
    if (!value.trim() && !image) return;
    setIsBusy(true);
    try {
      if (image) await submitImage();
      if (value.trim()) await submitText();
      onCaptured();
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
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") enter();
        }}
        onPaste={(e) => {
          const file = Array.from(e.clipboardData.files).find((f) =>
            f.type.startsWith("image/"),
          );
          if (file) {
            e.preventDefault();
            attachFile(file);
          }
        }}
        placeholder="Paste a link, tweet, video, or image — or dump a raw thought. ⌘↵ to enter."
        rows={2}
        className="w-full bg-transparent resize-none outline-none text-sm placeholder:text-[var(--muted)]"
      />

      {image && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:${image.mediaType};base64,${image.base64}`}
            alt=""
            className="h-12 w-12 rounded-md object-cover"
          />
          <span className="text-xs text-[var(--muted)] truncate max-w-32">{image.name}</span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as ImageAction)}
            className="flex-1 min-w-0 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs outline-none"
          >
            {IMAGE_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setImage(null)}
            className="text-[var(--muted)] hover:text-red-500 shrink-0"
            title="Remove image"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <ImagePlus size={13} /> Add image
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) attachFile(f);
              e.target.value = "";
            }}
          />
          <span className="text-[11px] text-[var(--muted)] hidden sm:inline">
            Links auto-fill title + thumbnail. Images go through AI.
          </span>
        </div>
        <button
          onClick={enter}
          disabled={isBusy || (!value.trim() && !image)}
          className="text-xs bg-[var(--mango)] text-white rounded-lg px-4 py-1.5 hover:brightness-105 disabled:opacity-50"
        >
          {isBusy ? "Entering…" : "Enter"}
        </button>
      </div>
    </div>
  );
}
