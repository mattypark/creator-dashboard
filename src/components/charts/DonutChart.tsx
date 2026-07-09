"use client";

import { motion } from "framer-motion";

export type Slice = { label: string; value: number; color: string };

type Props = {
  data: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSub?: string;
};

/** Lightweight SVG donut. No chart lib. Segments animate in. */
export function DonutChart({
  data,
  size = 150,
  thickness = 20,
  centerLabel,
  centerSub,
}: Props) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;

  // Precompute each segment's cumulative offset immutably before rendering.
  const segments = data.reduce<{ offset: number; dash: number }[]>((acc, d, i) => {
    const frac = d.value / total;
    const dash = frac * circ;
    const prevOffset = i === 0 ? 0 : acc[i - 1].offset + acc[i - 1].dash;
    return [...acc, { offset: prevOffset, dash }];
  }, []);

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={thickness}
        />
        {data.map((d, i) => {
          const { offset, dash } = segments[i];
          return (
            <motion.circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeLinecap="butt"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            />
          );
        })}
        {centerLabel && (
          <text
            x="50%"
            y="47%"
            textAnchor="middle"
            className="fill-[var(--foreground)] font-serif"
            style={{ fontSize: size * 0.2, fontWeight: 600 }}
          >
            {centerLabel}
          </text>
        )}
        {centerSub && (
          <text
            x="50%"
            y="62%"
            textAnchor="middle"
            className="fill-[var(--muted)]"
            style={{ fontSize: size * 0.075 }}
          >
            {centerSub}
          </text>
        )}
      </svg>
      <ul className="flex flex-col gap-1.5 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
            <span className="text-[var(--muted)]">{d.label}</span>
            <span className="ml-auto font-medium tabular-nums">
              {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
