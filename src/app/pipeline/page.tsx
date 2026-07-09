"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Script } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { QuickCapture } from "@/components/pipeline/QuickCapture";
import { Composer } from "@/components/pipeline/Composer";

export default function PipelinePage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [mode, setMode] = useState<"supabase" | "memory">("memory");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Script | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadScripts = useCallback(async () => {
    const r = await fetch("/api/scripts").then((x) => x.json());
    setScripts(r.scripts);
    setMode(r.mode);
  }, []);

  useEffect(() => {
    async function runLoad() {
      await loadScripts();
    }
    runLoad();
  }, [loadScripts]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return scripts;
    return scripts.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.body.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [scripts, query]);

  async function newBlank() {
    const r = await fetch("/api/scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled", status: "idea" }),
    });
    const { script } = await r.json();
    await loadScripts();
    setActive(script);
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 flex flex-col gap-6">
        <PageHeader
          kicker={mode === "memory" ? "Demo mode" : "Connected"}
          title="Pipeline"
          action={
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter scripts…"
                className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm w-56 outline-none focus:border-[var(--mango)]"
              />
              <Button onClick={newBlank} size="sm">
                + New
              </Button>
            </div>
          }
        />

        <QuickCapture onCaptured={loadScripts} flash={flash} />

        <div className="overflow-x-auto pb-2">
          <KanbanBoard scripts={filtered} onOpen={setActive} />
        </div>
      </div>

      {active && (
        <Composer
          script={active}
          onClose={() => setActive(null)}
          onChanged={loadScripts}
          flash={flash}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[var(--foreground)] text-[var(--background)] rounded-lg px-4 py-2 text-sm shadow-lg z-30">
          {toast}
        </div>
      )}
    </div>
  );
}
