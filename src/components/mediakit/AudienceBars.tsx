"use client";

type Bar = { label: string; pct: number };

type Props = {
  title: string;
  bars: Bar[];
  accent?: "mango" | "blueberry";
  flags?: boolean; // prefix geo rows with a country flag emoji
};

const FLAGS: Record<string, string> = {
  "united states": "🇺🇸",
  usa: "🇺🇸",
  us: "🇺🇸",
  "united kingdom": "🇬🇧",
  uk: "🇬🇧",
  canada: "🇨🇦",
  india: "🇮🇳",
  australia: "🇦🇺",
  germany: "🇩🇪",
  france: "🇫🇷",
  brazil: "🇧🇷",
  mexico: "🇲🇽",
  japan: "🇯🇵",
  philippines: "🇵🇭",
  nigeria: "🇳🇬",
};

function flagFor(label: string): string {
  return FLAGS[label.toLowerCase().trim()] ?? "🌐";
}

export function AudienceBars({ title, bars, accent = "blueberry", flags }: Props) {
  const max = Math.max(...bars.map((b) => b.pct), 1);
  const color = accent === "mango" ? "var(--mango)" : "var(--blueberry)";
  return (
    <div className="flex flex-col gap-3">
      <p className="kicker">{title}</p>
      <div className="flex flex-col gap-2.5">
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs text-[var(--muted)]">
              {flags && <span className="mr-1">{flagFor(b.label)}</span>}
              {b.label}
            </span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)] shadow-[inset_0_1px_2px_rgba(33,29,20,0.08)]">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]"
                style={{ background: color, width: `${(b.pct / max) * 100}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums">
              {b.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
