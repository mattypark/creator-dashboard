import Link from "next/link";

type Variant = "mango" | "outline" | "ghost";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  mango: "btn-minted",
  outline: "btn-engraved",
  ghost:
    "text-[var(--muted)] transition-colors duration-300 ease-lux hover:text-[var(--foreground)] active:scale-[0.98]",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

function classes(variant: Variant, size: Size, extra = "") {
  return `inline-flex items-center justify-center gap-1.5 rounded-lg font-medium disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "mango",
  size = "md",
  className = "",
  ...rest
}: ButtonProps) {
  return <button className={classes(variant, size, className)} {...rest} />;
}

type LinkButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  external?: boolean;
  className?: string;
};

export function LinkButton({
  href,
  children,
  variant = "mango",
  size = "md",
  external,
  className = "",
}: LinkButtonProps) {
  const cls = classes(variant, size, className);
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
