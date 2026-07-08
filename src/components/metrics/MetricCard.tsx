import { fmt } from "@/lib/format";
import type { MetricGroup } from "./MetricsSidebar";

type Props = {
  group: MetricGroup;
};

export function MetricCard({ group }: Props) {
  return (
    <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: group.color }}
        />
        <span className="text-xs font-semibold">{group.label}</span>
      </div>
      {group.metrics.length === 0 ? (
        <div className="text-xs text-[var(--muted)]">Connect later</div>
      ) : (
        <div className="flex flex-col gap-1">
          {group.metrics.map((m) => (
            <div key={m.metric_key} className="flex justify-between text-sm">
              <span className="capitalize text-[var(--muted)]">
                {m.metric_key}
              </span>
              <span className="font-semibold">{fmt(m.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
