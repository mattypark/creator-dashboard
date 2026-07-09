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
      prev.current = value;
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

  // When reduced motion is on, the value is static — derive it during render
  // instead of routing it through state.
  const displayValue = reduce ? value : display;

  return (
    <div className="stat-tile" data-accent={accent ? "true" : undefined}>
      <p className="kicker">{label}</p>
      <p
        className={`mt-1 font-serif text-4xl font-semibold tabular-nums tracking-[-0.02em] sm:text-5xl ${
          accent ? "text-[var(--mango)]" : ""
        }`}
      >
        {fmt(Math.round(displayValue))}
      </p>
      {sub && <p className="mt-1.5 text-xs text-[var(--muted)]">{sub}</p>}
    </div>
  );
}
