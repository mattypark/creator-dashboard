"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { fmt } from "@/lib/format";

type Props = {
  label: string;
  value: number;
  sub?: string;
  accent?: boolean; // mango-highlighted tile
};

/** Editorial stat tile: top rule, kicker label, big serif count-up number. */
export function StatTile({ label, value, sub, accent }: Props) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const prev = useRef(0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <div
      className={`border-t-2 pt-3 ${accent ? "border-[var(--mango)]" : "border-[var(--foreground)]"}`}
    >
      <p className="kicker">{label}</p>
      <p
        className={`font-serif text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl ${
          accent ? "text-[var(--mango)]" : ""
        }`}
      >
        {fmt(Math.round(display))}
      </p>
      {sub && <p className="mt-1 text-xs text-[var(--muted)]">{sub}</p>}
    </div>
  );
}
