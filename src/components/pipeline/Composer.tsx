"use client";

import { useState } from "react";
import { SCRIPT_STATUSES, type Platform, type Script, type ScriptStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/format";
import { VariantBlock } from "./VariantBlock";

const ALL_PLATFORMS: Platform[] = ["x", "linkedin", "instagram", "tiktok"];

type Props = {
  script: Script;
  onClose: () => void;
  onChanged: () => void;
  flash: (message: string) => void;
};

export function Composer({ script, onClose, onChanged, flash }: Props) {
  const [title, setTitle] = useState(script.title);
  const [body, setBody] = useState(script.body);
  const [status, setStatus] = useState<ScriptStatus>(script.status);
  const [variants, setVariants] = useState<Partial<Record<Platform, string>>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function save(patch: Partial<Script>) {
    await fetch("/api/scripts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: script.id, ...patch }),
    });
    onChanged();
  }

  async function generate() {
    setBusy("gen");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "repurpose",
          text: body,
          platforms: ALL_PLATFORMS,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash(data.needsKey ? "Add ANTHROPIC_API_KEY to .env.local" : data.error);
        return;
      }
      setVariants(data.variants);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    await fetch("/api/scripts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: script.id }),
    });
    onChanged();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[480px] max-w-full h-full bg-[var(--surface)] border-l border-[var(--border)] p-5 overflow-y-auto flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => save({ title })}
            className="bg-transparent text-lg font-semibold outline-none flex-1"
          />
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--foreground)] ml-2"
          >
            ✕
          </button>
        </div>

        <select
          value={status}
          onChange={(e) => {
            const s = e.target.value as ScriptStatus;
            setStatus(s);
            save({ status: s });
          }}
          className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1.5 text-sm w-40"
        >
          {SCRIPT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={() => save({ body })}
          rows={10}
          placeholder="Write your script…"
          className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md p-3 text-sm outline-none resize-y focus:border-[var(--muted)]"
        />

        <button
          onClick={generate}
          disabled={!!busy || !body.trim()}
          className="bg-indigo-500 hover:bg-indigo-400 text-white rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {busy === "gen" ? "Generating…" : "✦ Generate platform variants"}
        </button>

        {ALL_PLATFORMS.filter((p) => variants[p]).map((p) => (
          <VariantBlock
            key={p}
            platform={p}
            text={variants[p]!}
            scriptId={script.id}
            flash={flash}
          />
        ))}

        <button
          onClick={remove}
          className="mt-auto text-xs text-red-400/80 hover:text-red-400 self-start"
        >
          Delete script
        </button>
      </div>
    </div>
  );
}
