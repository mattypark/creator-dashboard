type Props = {
  children: React.ReactNode;
  variant?: "solid" | "outline" | "mango" | "blueberry";
  className?: string;
};

const VARIANTS: Record<NonNullable<Props["variant"]>, string> = {
  solid: "bg-[var(--surface-2)] text-[var(--muted)] border-transparent",
  outline: "bg-transparent text-[var(--muted)] border-[var(--border)]",
  mango: "bg-[var(--mango)]/12 text-[var(--mango)] border-transparent",
  blueberry: "bg-[var(--blueberry)]/12 text-[var(--blueberry)] border-transparent",
};

export function Chip({ children, variant = "solid", className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
