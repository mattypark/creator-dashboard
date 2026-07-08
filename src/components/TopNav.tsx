"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Pipeline" },
  { href: "/brain", label: "Brain" },
  { href: "/hub", label: "Hub" },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main navigation"
      className="flex items-center gap-1 border-b border-[var(--border)] bg-[var(--surface)] px-4 h-12 shrink-0"
    >
      <span className="text-sm font-semibold mr-4 tracking-tight">◆ Second Brain</span>
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
              active
                ? "bg-[var(--surface-2)] text-[var(--foreground)] font-medium"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
