"use client";

import { motion } from "framer-motion";
import { fmt } from "@/lib/format";

type Point = { label: string; value: number };

type Props = {
  points: Point[];
  color?: string;
  height?: number;
};

/** SVG area+line trend. Scales to container width via viewBox. */
export function TrendLine({ points, color = "var(--mango)", height = 120 }: Props) {
  if (points.length < 2) {
    return (
      <div className="flex h-28 items-center justify-center text-xs text-[var(--muted)]">
        Add metrics over time to see growth here.
      </div>
    );
  }
  const W = 320;
  const H = height;
  const pad = 8;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);

  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const area = `${pad},${H - pad} ${line} ${W - pad},${H - pad}`;
  const first = points[0].value;
  const last = points[points.length - 1].value;
  const deltaPct = first ? Math.round(((last - first) / first) * 100) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-2xl font-semibold tabular-nums">{fmt(last)}</span>
        <span
          className={`text-xs font-medium ${deltaPct >= 0 ? "text-[var(--mango)]" : "text-red-500"}`}
        >
          {deltaPct >= 0 ? "+" : ""}
          {deltaPct}%
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#trendFill)" />
        <motion.polyline
          points={line}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
        <circle cx={x(points.length - 1)} cy={y(last)} r={3.5} fill={color} />
      </svg>
    </div>
  );
}
