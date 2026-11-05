import type { Kpi } from "@/lib/marketing-types";
import { changeTone, formatChange, formatMetric } from "@/lib/marketing-format";
import { cx } from "@/lib/format";

export function KpiCard({ kpi, compact = false }: { kpi: Kpi; compact?: boolean }) {
  const tone = changeTone(kpi.changePct, kpi.goodDirection);
  return (
    <div className={cx("border border-gold/20 bg-ivory", compact ? "p-3.5" : "p-4")}>
      <p className="text-[0.63rem] tracking-[0.12em] text-gold">{kpi.label}</p>
      <p
        className={cx(
          "tnum mt-2 leading-tight text-forest",
          compact ? "text-[1.15rem]" : "text-[1.4rem]",
          kpi.value === null && "text-[0.85rem] font-normal text-ink-muted",
        )}
      >
        {formatMetric(kpi.value, kpi.format)}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {kpi.changePct === null ? (
          <span className="text-[0.68rem] text-ink-muted">لا مقارنة كافية</span>
        ) : (
          <span
            className={cx(
              "tnum inline-flex items-center gap-0.5 text-[0.7rem]",
              tone === "good" && "text-forest",
              tone === "bad" && "text-red-800",
              tone === "flat" && "text-ink-muted",
            )}
          >
            {kpi.changePct > 0 ? "▲" : kpi.changePct < 0 ? "▼" : "•"} {formatChange(kpi.changePct)}
          </span>
        )}
        {kpi.previous !== null ? (
          <span className="text-[0.66rem] text-ink-muted">
            سابقًا: {formatMetric(kpi.previous, kpi.format)}
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-[0.68rem] leading-5 text-ink-muted">
        {kpi.value === null ? (kpi.unavailable ?? kpi.hint) : kpi.hint}
      </p>
    </div>
  );
}

export function KpiGrid({ items, compact = false }: { items: Kpi[]; compact?: boolean }) {
  return (
    <div
      className={cx(
        "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
        compact ? "xl:grid-cols-5" : "xl:grid-cols-5",
      )}
    >
      {items.map((kpi) => (
        <KpiCard key={kpi.key} kpi={kpi} compact={compact} />
      ))}
    </div>
  );
}
