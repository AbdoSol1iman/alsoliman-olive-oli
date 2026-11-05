import Link from "next/link";
import { RANGE_PRESETS, rangeHref, type AnalyticsRange } from "@/lib/date-range";
import { cx } from "@/lib/format";

/**
 * Server-rendered date-range control. Presets are plain links (so they keep
 * working without JS) and the custom form preserves the page's other filters.
 */
export function RangeFilter({
  range,
  basePath,
  extra = {},
  showComparison = true,
}: {
  range: AnalyticsRange;
  basePath: string;
  extra?: Record<string, string | undefined>;
  showComparison?: boolean;
}) {
  const presets = RANGE_PRESETS.filter((preset) => preset.value !== "custom");
  return (
    <div className="space-y-2 print:hidden">
      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map((preset) => (
          <Link
            key={preset.value}
            href={rangeHref(
              basePath,
              { preset: preset.value, from: range.from, to: range.to },
              extra,
            )}
            className={cx(
              "inline-flex h-8 items-center rounded-xs border px-2.5 text-[0.72rem] transition-colors",
              range.preset === preset.value
                ? "border-forest bg-forest text-ivory"
                : "border-forest/20 text-forest hover:border-forest/60",
            )}
          >
            {preset.label}
          </Link>
        ))}

        <form method="get" action={basePath} className="flex flex-wrap items-center gap-1.5">
          <input type="hidden" name="preset" value="custom" />
          {Object.entries(extra).map(([key, value]) =>
            value ? <input key={key} type="hidden" name={key} value={value} /> : null,
          )}
          <label className="flex items-center gap-1 text-[0.68rem] text-ink-muted">
            من
            <input
              type="date"
              name="from"
              defaultValue={range.from}
              className="h-8 border border-forest/20 bg-ivory px-2 text-[0.72rem] text-charcoal outline-none focus:border-gold"
            />
          </label>
          <label className="flex items-center gap-1 text-[0.68rem] text-ink-muted">
            إلى
            <input
              type="date"
              name="to"
              defaultValue={range.to}
              className="h-8 border border-forest/20 bg-ivory px-2 text-[0.72rem] text-charcoal outline-none focus:border-gold"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-8 items-center rounded-xs bg-forest px-3 text-[0.72rem] text-ivory transition-colors hover:bg-forest-deep"
          >
            تطبيق
          </button>
        </form>
      </div>
      <p className="text-[0.68rem] text-ink-muted">
        الفترة: {range.labelAr}
        {showComparison ? ` · المقارنة: ${range.prevLabelAr}` : null}
      </p>
    </div>
  );
}
