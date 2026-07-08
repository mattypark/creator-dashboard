import { fmt } from "@/lib/format";

type Props = {
  overall: Record<string, number>;
};

export function OverallCard({ overall }: Props) {
  const keys = Object.keys(overall);
  return (
    <div className="bg-gradient-to-br from-indigo-500/20 to-transparent border border-indigo-500/30 rounded-lg p-3">
      <div className="text-xs font-semibold text-indigo-300 mb-2">OVERALL</div>
      {keys.length === 0 ? (
        <div className="text-xs text-[var(--muted)]">
          Connect a platform to see totals
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {keys.map((k) => (
            <div key={k} className="flex justify-between text-sm">
              <span className="capitalize text-[var(--muted)]">{k}</span>
              <span className="font-semibold">{fmt(overall[k])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
