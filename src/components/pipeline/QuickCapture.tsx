"use client";

import { useState } from "react";

type Props = {
  onCaptured: () => void;
  flash: (message: string) => void;
};

export function QuickCapture({ onCaptured, flash }: Props) {
  const [thought, setThought] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function capture(action: "draft" | "ideas") {
    if (!thought.trim()) return;
    setBusy(action);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text: thought }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash(data.needsKey ? "Add ANTHROPIC_API_KEY to .env.local" : data.error);
        return;
      }
      await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: thought.slice(0, 60),
          body: data.result,
          status: action === "ideas" ? "idea" : "script",
        }),
      });
      setThought("");
      onCaptured();
      flash(action === "ideas" ? "Ideas captured" : "Draft created");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mb-6 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
      <textarea
        value={thought}
        onChange={(e) => setThought(e.target.value)}
        placeholder="Dump a raw thought… AI turns it into a script or ideas."
        rows={2}
        className="w-full bg-transparent resize-none outline-none text-sm placeholder:text-[var(--muted)]"
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => capture("ideas")}
          disabled={!!busy}
          className="text-xs border border-[var(--border)] rounded-md px-3 py-1.5 hover:bg-[var(--surface-2)] disabled:opacity-50"
        >
          {busy === "ideas" ? "Thinking…" : "Get ideas"}
        </button>
        <button
          onClick={() => capture("draft")}
          disabled={!!busy}
          className="text-xs bg-indigo-500 text-white rounded-md px-3 py-1.5 hover:bg-indigo-400 disabled:opacity-50"
        >
          {busy === "draft" ? "Drafting…" : "Draft script"}
        </button>
      </div>
    </div>
  );
}
