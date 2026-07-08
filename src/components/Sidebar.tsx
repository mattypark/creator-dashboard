"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Brain,
  BarChart3,
  KanbanSquare,
  IdCard,
  PenLine,
  Plus,
} from "lucide-react";
import type { MetricPlatform } from "@/lib/types";
import { DEFAULT_HANDLES, profileUrl } from "@/data/handles";

type IconType = React.ComponentType<{ size?: number; className?: string }>;
type NavItem = { href: string; label: string; icon: IconType; external?: boolean };

const MAIN: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/brain", label: "Brain", icon: Brain },
  { href: "/scripts", label: "Scripts", icon: PenLine },
  { href: "/hub", label: "Hub", icon: BarChart3 },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
];

const MEDIA: NavItem[] = [{ href: "/media-kit", label: "Media Kit", icon: IdCard }];

// Platform icons; URLs are built from real handles via profileUrl().
const PLATFORM_ICON: Record<MetricPlatform, { label: string; icon: IconType }> = {
  x: { label: "X", icon: XIcon },
  linkedin: { label: "LinkedIn", icon: LinkedinIcon },
  youtube: { label: "YouTube", icon: YoutubeIcon },
  instagram: { label: "Instagram", icon: InstagramIcon },
  tiktok: { label: "TikTok", icon: TikTokIcon },
};

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const cls = `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
    active
      ? "font-medium text-[var(--foreground)] bg-[var(--mango)]/10"
      : "text-[var(--muted)] hover:translate-x-0.5 hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
  }`;
  const inner = (
    <>
      <Icon size={17} className={active ? "text-[var(--mango)]" : ""} />
      <span>{item.label}</span>
      {active && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--mango)]" />
      )}
    </>
  );
  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={item.href} className={cls}>
      {inner}
    </Link>
  );
}

function GroupLabel({ children }: { children: string }) {
  return (
    <p className="mb-1 mt-5 px-3 text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]/70">
      {children}
    </p>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [handles, setHandles] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem("hub_handles");
      if (raw) setHandles(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const platformItems: NavItem[] = (
    Object.keys(PLATFORM_ICON) as MetricPlatform[]
  ).map((key) => {
    const handle = handles[key] || DEFAULT_HANDLES[key];
    return {
      href: profileUrl(key, handle),
      label: PLATFORM_ICON[key].label,
      icon: PLATFORM_ICON[key].icon,
      external: true,
    };
  });

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]/60 p-4 md:flex">
      <Link href="/" className="mb-6 flex items-center gap-2 px-2">
        <span className="text-lg font-serif font-semibold tracking-tight lowercase">
          studio<span className="text-[var(--mango)]">.</span>
        </span>
      </Link>

      <nav className="flex flex-col">
        {MAIN.map((item) => (
          <NavRow key={item.href} item={item} active={isActive(item.href)} />
        ))}

        <GroupLabel>Platforms</GroupLabel>
        {platformItems.map((item) => (
          <NavRow key={item.label} item={item} active={false} />
        ))}

        <GroupLabel>Media Kit</GroupLabel>
        {MEDIA.map((item) => (
          <NavRow key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>

      <Link
        href="/brain"
        className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-[var(--mango)] px-3 py-2 text-sm font-medium text-white transition-transform hover:brightness-105 active:scale-[0.98]"
      >
        <Plus size={16} /> Capture
      </Link>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const items = [...MAIN, ...MEDIA];
  return (
    <div className="sticky top-0 z-20 flex items-center gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--surface)]/90 px-3 py-2 backdrop-blur md:hidden">
      <span className="mr-2 font-serif font-semibold lowercase">
        studio<span className="text-[var(--mango)]">.</span>
      </span>
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-full px-3 py-1 text-xs transition-colors ${
              active
                ? "bg-[var(--mango)]/15 text-[var(--foreground)] font-medium"
                : "text-[var(--muted)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

// Lucide has no X/TikTok brand marks — small inline glyphs.
function XIcon({ size = 17, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.9 2h3.3l-7.2 8.2L23.6 22h-6.6l-5.2-6.8L5.9 22H2.6l7.7-8.8L1.7 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.8L7.2 3.9H5.3L17.7 20Z" />
    </svg>
  );
}

function TikTokIcon({ size = 17, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M16.5 3c.3 2.1 1.5 3.5 3.5 3.7v2.4c-1.2.1-2.3-.2-3.5-.9v6.1c0 3.4-2.6 5.7-5.7 5.7A5.6 5.6 0 0 1 5.3 14c0-3.2 3-5.6 6.2-5v2.6c-.5-.2-1-.2-1.5-.1-1.3.2-2.2 1.3-2.1 2.7.1 1.4 1.3 2.4 2.7 2.3 1.4-.1 2.4-1.2 2.4-2.7V3h3.5Z" />
    </svg>
  );
}

function LinkedinIcon({ size = 17, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.55c0-1.32-.02-3.02-1.84-3.02-1.84 0-2.12 1.44-2.12 2.92V21h-4V9Z" />
    </svg>
  );
}

function YoutubeIcon({ size = 17, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.76-1.77C19.25 5.1 12 5.1 12 5.1s-7.25 0-8.84.43A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.76 1.77c1.59.43 8.84.43 8.84.43s7.25 0 8.84-.43a2.5 2.5 0 0 0 1.76-1.77C23 15.2 23 12 23 12ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z" />
    </svg>
  );
}

function InstagramIcon({ size = 17, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
