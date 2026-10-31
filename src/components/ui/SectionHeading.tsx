import type { ReactNode } from "react";
import { cx } from "@/lib/format";

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = "start",
  tone = "forest",
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  body?: string;
  align?: "start" | "center";
  tone?: "forest" | "ivory";
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col gap-6",
        align === "center" ? "items-center text-center" : "items-start",
        action && "md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className={cx("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow ? (
          <div
            className={cx(
              "mb-4 flex items-center gap-3",
              align === "center" && "justify-center",
            )}
          >
            <span className="h-px w-8 bg-gold/60" />
            <span className="eyebrow">{eyebrow}</span>
            {align === "center" && <span className="h-px w-8 bg-gold/60" />}
          </div>
        ) : null}
        <h2
          className={cx(
            "text-[clamp(1.9rem,4vw,3.1rem)]",
            tone === "ivory" ? "text-ivory" : "text-forest",
          )}
        >
          {title}
        </h2>
        {body ? (
          <p
            className={cx(
              "mt-4 max-w-xl text-[0.95rem] leading-8",
              align === "center" && "mx-auto",
              tone === "ivory" ? "text-sage" : "text-ink-muted",
            )}
          >
            {body}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
