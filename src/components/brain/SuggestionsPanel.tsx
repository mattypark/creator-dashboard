"use client";

import type { AgentSuggestion } from "@/lib/types";

type Props = {
  suggestions: AgentSuggestion[];
  onAccept: (suggestion: AgentSuggestion) => void;
  onDismiss: (suggestion: AgentSuggestion) => void;
  onRunAgent: () => void;
  agentBusy: boolean;
};

export function SuggestionsPanel({
  suggestions,
  onAccept,
  onDismiss,
  onRunAgent,
  agentBusy,
}: Props) {
  return (
    <section className="bg-gradient-to-br from-[var(--blueberry)]/8 to-transparent border border-[var(--blueberry)]/25 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-semibold text-[var(--blueberry)]">
            Agent suggestions
          </h3>
          <p className="text-[11px] text-[var(--muted)]">
            Ideas and connections drawn from your captures.
          </p>
        </div>
        <button
          onClick={onRunAgent}
          disabled={agentBusy}
          className="text-xs border border-[var(--blueberry)]/40 text-[var(--blueberry)] rounded-lg px-3 py-1.5 hover:bg-[var(--blueberry)]/10 disabled:opacity-50"
        >
          {agentBusy ? "Thinking…" : "✦ Run agent now"}
        </button>
      </div>

      {suggestions.length === 0 ? (
        <div className="text-xs text-[var(--muted)]">
          No suggestions yet. Capture a few items, then run the agent.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {suggestions.map((s) => (
            <li
              key={s.id}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{s.title}</div>
                {s.body && (
                  <div className="text-xs text-[var(--muted)] mt-0.5">{s.body}</div>
                )}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => onAccept(s)}
                  className="text-[11px] font-medium text-[var(--mango)] hover:brightness-110"
                >
                  accept →
                </button>
                <button
                  onClick={() => onDismiss(s)}
                  className="text-[11px] text-[var(--muted)] hover:text-red-400"
                >
                  dismiss
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
