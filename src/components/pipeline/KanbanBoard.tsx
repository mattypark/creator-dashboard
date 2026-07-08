import { SCRIPT_STATUSES, type Script } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/format";
import { ScriptCard } from "./ScriptCard";

type Props = {
  scripts: Script[];
  onOpen: (script: Script) => void;
};

export function KanbanBoard({ scripts, onOpen }: Props) {
  return (
    <div className="flex gap-4 min-w-max">
      {SCRIPT_STATUSES.map((status) => {
        const column = scripts.filter((s) => s.status === status);
        return (
          <div key={status} className="w-64 shrink-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold text-[var(--muted)] uppercase">
                {STATUS_LABEL[status]}
              </span>
              <span className="text-xs text-[var(--muted)]">{column.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {column.map((s) => (
                <ScriptCard key={s.id} script={s} onOpen={onOpen} />
              ))}
              {column.length === 0 && (
                <div className="text-xs text-[var(--muted)] px-1 py-4 text-center border border-dashed border-[var(--border)] rounded-lg">
                  empty
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
