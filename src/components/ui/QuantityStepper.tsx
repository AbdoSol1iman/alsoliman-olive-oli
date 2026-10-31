"use client";

import { Minus, Plus } from "./Icons";
import { cx } from "@/lib/format";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  size = "md",
  label,
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number | null;
  size?: "sm" | "md";
  label: string;
  className?: string;
}) {
  const limit = max ?? Number.MAX_SAFE_INTEGER;
  const atMin = value <= min;
  const atMax = value >= limit;
  const box = size === "sm" ? "h-9 w-9" : "h-11 w-11";

  return (
    <div
      className={cx(
        "inline-flex items-center rounded-xs border border-forest/15 bg-ivory",
        className,
      )}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={atMin}
        aria-label={`${label} −`}
        className={cx(
          box,
          "grid place-items-center text-forest transition-colors hover:bg-cream disabled:opacity-30",
        )}
      >
        <Minus size={15} />
      </button>
      <span
        className={cx(
          "tnum min-w-8 text-center text-[0.9rem] font-medium text-charcoal",
          size === "sm" && "min-w-6 text-[0.8rem]",
        )}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(limit, value + 1))}
        disabled={atMax}
        aria-label={`${label} +`}
        className={cx(
          box,
          "grid place-items-center text-forest transition-colors hover:bg-cream disabled:opacity-30",
        )}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
