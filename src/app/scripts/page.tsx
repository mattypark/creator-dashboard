"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SCRIPT_STATUSES, type Script, type ScriptStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [mode, setMode] = useState<"supabase" | "memory">("memory");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const load = useCallback(async () => {
    const r = await fetch("/api/scripts").then((x) => x.json());
    setScripts(r.scripts);
    setMode(r.mode);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const active = scripts.find((s) => s.id === activeId) ?? null;

  async function newScript() {
    const r = await fetch("/api/scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled script", status: "script" }),
    });
    const { script } = await r.json();
    await load();
    setActiveId(script.id);
  }

  async function save(id: string, patch: Partial<Script>) {
    await fetch("/api/scripts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    await load();
  }

  async function remove(id: string) {
    await fetch("/api/scripts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setActiveId(null);
    await load();
    flash("Deleted");
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
      <div className="px-6 pt-8 pb-4">
        <PageHeader
          kicker={mode === "memory" ? "Demo mode" : "Connected"}
          title="Scripts"
          action={
            <Button onClick={newScript} size="sm">
              + New script
            </Button>
          }
        />
      </div>

      <div className="flex-1 min-h-0 flex border-t border-[var(--border)]">
        {/* List */}
        <div className="w-72 shrink-0 border-r border-[var(--border)] flex flex-col min-h-0">
          <div className="p-3 border-b border-[var(--border)]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search scripts…"
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--mango)]"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-4 text-xs text-[var(--muted)]">
                No scripts yet. Start writing.
              </p>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--border)] transition-colors ${
                    s.id === activeId
                      ? "bg-[var(--mango)]/10"
                      : "hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <div className="text-sm font-medium truncate">{s.title}</div>
                  <div className="text-[11px] text-[var(--muted)] truncate">
                    {s.body ? s.body.slice(0, 60) : STATUS_LABEL[s.status]}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {active ? (
            <ScriptEditor
              key={active.id}
              script={active}
              onSave={(patch) => save(active.id, patch)}
              onDelete={() => remove(active.id)}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-[var(--muted)]">
              Select a script or create a new one.
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[var(--foreground)] text-[var(--background)] rounded-lg px-4 py-2 text-sm shadow-lg z-30">
          {toast}
        </div>
      )}
    </div>
  );
}

function ScriptEditor({
  script,
  onSave,
  onDelete,
}: {
  script: Script;
  onSave: (patch: Partial<Script>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(script.title);
  const [body, setBody] = useState(script.body);
  const [status, setStatus] = useState<ScriptStatus>(script.status);
  const [tagInput, setTagInput] = useState(script.tags.join(", "));

  function commitTags() {
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onSave({ tags });
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-8 flex flex-col gap-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => save(title !== script.title, () => onSave({ title }))}
        className="bg-transparent font-serif text-3xl font-semibold tracking-tight outline-none"
        placeholder="Script title"
      />

      <div className="flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => {
            const s = e.target.value as ScriptStatus;
            setStatus(s);
            onSave({ status: s });
          }}
          className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md px-2 py-1 text-sm"
        >
          {SCRIPT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onBlur={commitTags}
          placeholder="tags, comma separated"
          className="flex-1 bg-transparent border-b border-[var(--border)] text-sm outline-none focus:border-[var(--mango)] py-1"
        />
      </div>

      {script.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {script.tags.map((t) => (
            <Chip key={t} variant="mango">
              {t}
            </Chip>
          ))}
        </div>
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={() => save(body !== script.body, () => onSave({ body }))}
        placeholder="Write your script…"
        className="min-h-[50vh] bg-transparent text-[15px] leading-relaxed outline-none resize-none"
      />

      <button
        onClick={onDelete}
        className="self-start text-xs text-[var(--muted)] hover:text-red-500"
      >
        Delete script
      </button>
    </div>
  );
}

function save(changed: boolean, fn: () => void) {
  if (changed) fn();
}
