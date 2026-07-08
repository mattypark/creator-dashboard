"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AgentSuggestion, KnowledgeItem } from "@/lib/types";
import { BrainCapture } from "@/components/brain/BrainCapture";
import { KnowledgeCard } from "@/components/brain/KnowledgeCard";
import { SuggestionsPanel } from "@/components/brain/SuggestionsPanel";
import { PageHeader } from "@/components/ui/PageHeader";

export default function BrainPage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([]);
  const [mode, setMode] = useState<"supabase" | "memory">("memory");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [agentBusy, setAgentBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flash = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    const r = await fetch("/api/knowledge").then((x) => x.json());
    setItems(r.items);
    setMode(r.mode);
  }, []);

  const loadSuggestions = useCallback(async () => {
    const r = await fetch("/api/suggestions?status=new").then((x) => x.json());
    setSuggestions(r.suggestions);
  }, []);

  useEffect(() => {
    load();
    loadSuggestions();
  }, [load, loadSuggestions]);

  async function runAgent() {
    setAgentBusy(true);
    try {
      const r = await fetch("/api/agent", { method: "POST" }).then((x) => x.json());
      await load();
      await loadSuggestions();
      flash(
        r.ai
          ? `Agent: ${r.suggestions} ideas, ${r.edges} links, ${r.summarized} summarized`
          : `Agent backfilled ${r.backfilled} — add ANTHROPIC_API_KEY for ideas`,
      );
    } finally {
      setAgentBusy(false);
    }
  }

  async function acceptSuggestion(s: AgentSuggestion) {
    await fetch("/api/scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: s.title, body: s.body, status: "idea" }),
    });
    await fetch("/api/suggestions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, status: "accepted" }),
    });
    await loadSuggestions();
    flash("Added to pipeline");
  }

  async function dismissSuggestion(s: AgentSuggestion) {
    await fetch("/api/suggestions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, status: "dismissed" }),
    });
    await loadSuggestions();
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.summary ?? "").toLowerCase().includes(q) ||
        (i.raw_text ?? "").toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [items, query]);

  async function promote(item: KnowledgeItem) {
    setBusyId(item.id);
    try {
      const bodyLines = [item.summary || item.raw_text || "", item.url ? `Source: ${item.url}` : ""]
        .filter(Boolean)
        .join("\n\n");
      const r = await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          body: bodyLines,
          status: "idea",
          tags: item.tags,
        }),
      });
      const { script } = await r.json();
      await fetch("/api/knowledge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          status: "promoted",
          linked_script_id: script.id,
        }),
      });
      await load();
      flash("Promoted to pipeline");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item: KnowledgeItem) {
    await fetch("/api/knowledge", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
    await load();
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="max-w-5xl mx-auto p-6 flex flex-col gap-5">
        <PageHeader
          kicker={mode === "memory" ? "Demo mode" : "Connected"}
          title="Brain"
          action={
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search captures…"
              className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm w-56 outline-none focus:border-[var(--mango)]"
            />
          }
        />

        <BrainCapture onCaptured={load} flash={flash} />

        <SuggestionsPanel
          suggestions={suggestions}
          onAccept={acceptSuggestion}
          onDismiss={dismissSuggestion}
          onRunAgent={runAgent}
          agentBusy={agentBusy}
        />

        {filtered.length === 0 ? (
          <div className="text-sm text-[var(--muted)] text-center border border-dashed border-[var(--border)] rounded-xl py-16">
            {items.length === 0
              ? "Nothing captured yet. Paste a link or dump a thought above."
              : "No captures match your search."}
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <KnowledgeCard
                key={item.id}
                item={item}
                onPromote={promote}
                onDelete={remove}
                isBusy={busyId === item.id}
              />
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[var(--foreground)] text-[var(--background)] rounded-lg px-4 py-2 text-sm shadow-lg z-30">
          {toast}
        </div>
      )}
    </div>
  );
}
