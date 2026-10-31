import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/format";

type Variant = "primary" | "gold" | "outline" | "ghost" | "light";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-forest text-ivory hover:bg-forest-deep border border-forest hover:border-forest-deep",
  gold: "bg-gold text-forest-deep hover:bg-gold-soft border border-gold hover:border-gold-soft",
  outline:
    "border border-forest/25 text-forest hover:border-forest/70 hover:bg-forest/[0.04]",
  ghost: "text-forest hover:text-gold border border-transparent",
  light:
    "border border-gold-pale/40 text-ivory hover:border-gold-pale hover:bg-ivory/5",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-5 text-[0.8rem]",
  md: "h-12 px-7 text-[0.9rem]",
  lg: "h-[3.4rem] px-9 text-[0.95rem]",
};

const base =
  "group/btn relative inline-flex items-center justify-center gap-2.5 rounded-xs font-medium tracking-wide " +
  "transition-[background-color,border-color,color,transform] duration-300 ease-[var(--ease-out-soft)] " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-45 whitespace-nowrap";

type SharedProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: SharedProps & ComponentProps<"button">) {
  return (
    <button className={cx(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: SharedProps & ComponentProps<typeof Link>) {
  return (
    <Link className={cx(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </Link>
  );
}
