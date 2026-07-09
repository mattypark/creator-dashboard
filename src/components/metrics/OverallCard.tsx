import { fmt } from "@/lib/format";

type Props = {
  overall: Record<string, number>;
};

export function OverallCard({ overall }: Props) {
  const keys = Object.keys(overall);
  return (
    <div className="note-green p-4">
      <div className="kicker mb-2 text-[var(--blueberry)]">Overall</div>
      {keys.length === 0 ? (
        <div className="text-xs text-[var(--muted)]">
          Connect a platform to see totals
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {keys.map((k) => (
            <div key={k} className="flex items-baseline justify-between text-sm">
              <span className="capitalize text-[var(--muted)]">{k}</span>
              <span className="font-serif text-lg font-semibold tabular-nums tracking-tight">
                {fmt(overall[k])}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
