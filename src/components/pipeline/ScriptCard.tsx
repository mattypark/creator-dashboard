import type { Script } from "@/lib/types";

type Props = {
  script: Script;
  onOpen: (script: Script) => void;
};

export function ScriptCard({ script, onOpen }: Props) {
  return (
    <button
      onClick={() => onOpen(script)}
      className="text-left bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 hover:border-[var(--muted)] transition-colors"
    >
      <div className="text-sm font-medium truncate">{script.title}</div>
      {script.body && (
        <div className="text-xs text-[var(--muted)] mt-1 line-clamp-2">
          {script.body}
        </div>
      )}
      {script.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {script.tags.map((t) => (
            <span
              key={t}
              className="text-[10px] bg-[var(--surface-2)] rounded px-1.5 py-0.5 text-[var(--muted)]"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
