import { OliveBranch } from "@/components/brand/Logo";
import { cx } from "@/lib/format";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  body,
  children,
  align = "start",
}: {
  eyebrow: string;
  title: string;
  body?: string;
  children?: ReactNode;
  align?: "start" | "center";
}) {
  return (
    <section className="relative overflow-hidden border-b border-gold/15 bg-cream/30">
      <OliveBranch
        className="pointer-events-none absolute -end-14 -top-8 h-[300px] w-auto opacity-[0.12]"
        tone="#7C8A57"
      />
      <div
        className={cx(
          "container-page relative py-14 md:py-20",
          align === "center" && "text-center",
        )}
      >
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-[clamp(2rem,4.6vw,3.4rem)]">{title}</h1>
        {body ? (
          <p
            className={cx(
              "mt-4 max-w-xl text-[0.95rem] leading-8 text-ink-muted",
              align === "center" && "mx-auto",
            )}
          >
            {body}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}
