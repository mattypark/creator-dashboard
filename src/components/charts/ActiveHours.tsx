"use client";

import { motion } from "framer-motion";

type Props = {
  hours: number[]; // up to 24 values, relative activity per hour
};

const LABELS = ["12a", "6a", "12p", "6p"];

/** When your audience is active — 24 vertical bars (local time). */
export function ActiveHours({ hours }: Props) {
  if (!hours || hours.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-xs text-[var(--muted)]">
        Upload an audience screenshot to see active hours.
      </div>
    );
  }
  const data = Array.from({ length: 24 }, (_, i) => hours[i] ?? 0);
  const max = Math.max(...data, 1);
  const peak = data.indexOf(max);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-[3px] h-24">
        {data.map((v, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-t-sm"
            style={{
              background: i === peak ? "var(--mango)" : "var(--blueberry)",
              opacity: i === peak ? 1 : 0.35 + 0.65 * (v / max),
            }}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max((v / max) * 100, 4)}%` }}
            transition={{ duration: 0.5, delay: i * 0.015, ease: "easeOut" }}
            title={`${i}:00 — ${v}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-[var(--muted)]">
        {LABELS.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <p className="text-[11px] text-[var(--muted)]">
        Peak around <span className="font-medium text-[var(--foreground)]">{peak}:00</span>
      </p>
    </div>
  );
}
