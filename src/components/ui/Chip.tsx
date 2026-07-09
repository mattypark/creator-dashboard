type Props = {
  children: React.ReactNode;
  variant?: "solid" | "outline" | "mango" | "blueberry";
  className?: string;
};

const VARIANTS: Record<NonNullable<Props["variant"]>, string> = {
  solid:
    "bg-[var(--surface-2)]/80 text-[var(--foreground)]/70 border-[var(--foreground)]/8",
  outline:
    "bg-[var(--surface)] text-[var(--muted)] border-[var(--border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
  mango: "bg-[var(--mango)]/10 text-[var(--mango)] border-[var(--mango)]/25",
  blueberry:
    "bg-[var(--blueberry)]/10 text-[var(--blueberry)] border-[var(--blueberry)]/25",
};

export function Chip({ children, variant = "solid", className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-[0.01em] ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
