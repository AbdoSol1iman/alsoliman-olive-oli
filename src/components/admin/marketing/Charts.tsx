import { formatNumber, formatPrice } from "@/lib/format";
import type {
  BuyerTrendPoint,
  CustomerTrendPoint,
  FunnelStage,
  OverviewPoint,
} from "@/lib/marketing";

/* ------------------------------------------------------------------ */
/* Revenue vs spend                                                    */
/* ------------------------------------------------------------------ */

export function RevenueSpendChart({
  points,
  hasSpend,
}: {
  points: OverviewPoint[];
  hasSpend: boolean;
}) {
  const width = 780;
  const height = 250;
  const padX = 18;
  const padTop = 24;
  const padBottom = 30;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const max = Math.max(
    ...points.map((point) => Math.max(point.revenue, point.spend ?? 0)),
    1,
  );
  const slot = innerW / Math.max(points.length, 1);
  const barW = Math.max(2.5, Math.min(13, slot * 0.3));
  const labelEvery = Math.max(1, Math.ceil(points.length / 9));

  const ticks = [0, 0.5, 1].map((tick) => ({
    y: padTop + innerH - innerH * tick,
    value: Math.round(max * tick),
  }));

  return (
    <div className="w-full overflow-x-auto">
      <div className="mb-2 flex flex-wrap items-center gap-4 text-[0.68rem] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 bg-olive" /> الإيراد
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 bg-gold" /> المصاريف الإعلانية
          {hasSpend ? "" : " (غير مسجلة)"}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[600px]"
        role="img"
        aria-label="الإيراد والمصاريف الإعلانية حسب الفترة"
      >
        {ticks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={padX}
              x2={width - padX}
              y1={tick.y}
              y2={tick.y}
              stroke="#26311f"
              strokeOpacity="0.12"
              strokeDasharray="3 4"
            />
            <text x={width - padX} y={tick.y - 4} textAnchor="end" fontSize="9" fill="#6b7263">
              {formatNumber(tick.value, "en")}
            </text>
          </g>
        ))}

        {points.map((point, index) => {
          const groupX = padX + index * slot;
          const revenueH = point.revenue > 0 ? Math.max((point.revenue / max) * innerH, 2) : 0;
          const spendH =
            point.spend !== null && point.spend > 0
              ? Math.max((point.spend / max) * innerH, 2)
              : 0;
          const showLabel = index % labelEvery === 0 || index === points.length - 1;
          return (
            <g key={point.key}>
              {revenueH > 0 ? (
                <rect
                  x={groupX + slot / 2 - barW - 1}
                  y={padTop + innerH - revenueH}
                  width={barW}
                  height={revenueH}
                  fill="#4a5a3c"
                  rx="1.5"
                >
                  <title>{`${point.label} — إيراد ${formatPrice(point.revenue)} · ${point.orders} طلب`}</title>
                </rect>
              ) : null}
              {spendH > 0 ? (
                <rect
                  x={groupX + slot / 2 + 1}
                  y={padTop + innerH - spendH}
                  width={barW}
                  height={spendH}
                  fill="#b79a55"
                  rx="1.5"
                >
                  <title>{`${point.label} — مصاريف ${formatPrice(point.spend ?? 0)}`}</title>
                </rect>
              ) : null}
              {revenueH === 0 && spendH === 0 ? (
                <rect
                  x={groupX + slot / 2 - barW / 2}
                  y={padTop + innerH - 1.5}
                  width={barW}
                  height={1.5}
                  fill="#26311f"
                  fillOpacity="0.12"
                />
              ) : null}
              {showLabel ? (
                <text
                  x={groupX + slot / 2}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="8.5"
                  fill="#6b7263"
                >
                  {point.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Funnel                                                              */
/* ------------------------------------------------------------------ */

export function FunnelBars({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map((stage) => stage.value ?? 0), 1);
  return (
    <div className="space-y-4">
      {stages.map((stage, index) => {
        const width =
          stage.value === null || stage.value === 0
            ? 0
            : Math.max((stage.value / max) * 100, 2.5);
        return (
          <div key={stage.key}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[0.78rem] text-forest">{stage.label}</span>
              <span className="tnum text-[0.78rem] text-forest">
                {stage.value === null ? "غير متاح" : formatNumber(stage.value, "en")}
                {stage.conversionFromPrevious !== null ? (
                  <span className="ms-2 text-[0.66rem] font-normal text-ink-muted">
                    {stage.conversionFromPrevious.toFixed(1)}% من السابق
                  </span>
                ) : null}
                {stage.dropOff !== null ? (
                  <span className="ms-2 text-[0.66rem] font-normal text-ink-muted">
                    تسرّب {stage.dropOff.toFixed(1)}%
                  </span>
                ) : null}
              </span>
            </div>
            <div className="h-8 overflow-hidden bg-cream/70">
              <div
                className="h-full bg-gradient-to-l from-forest to-olive"
                style={{ width: `${width}%` }}
              />
            </div>
            <p className="mt-1 text-[0.66rem] leading-5 text-ink-muted">{stage.note}</p>
            {stage.warning ? (
              <p className="mt-1 text-[0.66rem] leading-5 text-red-800">{stage.warning}</p>
            ) : null}
            {index === 0 ? null : null}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Horizontal bars (geography, products, …)                            */
/* ------------------------------------------------------------------ */

export function HorizontalBarList({
  items,
  format = "currency",
  emptyLabel = "لا توجد بيانات لعرضها.",
}: {
  items: { label: string; value: number; hint?: string }[];
  format?: "currency" | "number";
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-[0.78rem] text-ink-muted">{emptyLabel}</p>;
  }
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[0.76rem] text-forest">{item.label}</span>
            <span className="tnum shrink-0 text-[0.72rem] text-ink-muted">
              {format === "currency"
                ? formatPrice(item.value)
                : formatNumber(item.value, "en")}
            </span>
          </div>
          <div className="h-3 overflow-hidden bg-cream/70">
            <div
              className="h-full bg-gradient-to-l from-gold to-sage-deep"
              style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 2 : 0)}%` }}
            />
          </div>
          {item.hint ? (
            <p className="mt-0.5 text-[0.65rem] text-ink-muted">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sparkline                                                           */
/* ------------------------------------------------------------------ */

export function CustomerTrendChart({ points }: { points: CustomerTrendPoint[] }) {
  if (points.length === 0) {
    return <p className="py-6 text-center text-[0.78rem] text-ink-muted">لا توجد بيانات.</p>;
  }
  const width = 780;
  const height = 230;
  const padX = 18;
  const padTop = 22;
  const padBottom = 28;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const max = Math.max(...points.flatMap((point) => [point.newCustomers, point.returningCustomers]), 1);
  const slot = innerW / points.length;
  const barW = Math.max(2.5, Math.min(12, slot * 0.3));
  const labelEvery = Math.max(1, Math.ceil(points.length / 9));

  return (
    <div className="w-full overflow-x-auto">
      <div className="mb-2 flex flex-wrap items-center gap-4 text-[0.68rem] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 bg-forest" /> عملاء جدد
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 bg-gold" /> عملاء عائدون
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[600px]"
        role="img"
        aria-label="العملاء الجدد والعائدون حسب الفترة"
      >
        {[0, 0.5, 1].map((tick) => {
          const y = padTop + innerH - innerH * tick;
          return (
            <line
              key={tick}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="#26311f"
              strokeOpacity="0.12"
              strokeDasharray="3 4"
            />
          );
        })}
        {points.map((point, index) => {
          const groupX = padX + index * slot;
          const newH =
            point.newCustomers > 0 ? Math.max((point.newCustomers / max) * innerH, 2) : 0;
          const returningH =
            point.returningCustomers > 0
              ? Math.max((point.returningCustomers / max) * innerH, 2)
              : 0;
          const showLabel = index % labelEvery === 0 || index === points.length - 1;
          return (
            <g key={point.key}>
              {newH > 0 ? (
                <rect
                  x={groupX + slot / 2 - barW - 1}
                  y={padTop + innerH - newH}
                  width={barW}
                  height={newH}
                  fill="#26311f"
                  rx="1.5"
                >
                  <title>{`${point.label} — ${point.newCustomers} عميل جديد`}</title>
                </rect>
              ) : null}
              {returningH > 0 ? (
                <rect
                  x={groupX + slot / 2 + 1}
                  y={padTop + innerH - returningH}
                  width={barW}
                  height={returningH}
                  fill="#b79a55"
                  rx="1.5"
                >
                  <title>{`${point.label} — ${point.returningCustomers} عميل عائد`}</title>
                </rect>
              ) : null}
              {newH === 0 && returningH === 0 ? (
                <rect
                  x={groupX + slot / 2 - barW / 2}
                  y={padTop + innerH - 1.5}
                  width={barW}
                  height={1.5}
                  fill="#26311f"
                  fillOpacity="0.12"
                />
              ) : null}
              {showLabel ? (
                <text
                  x={groupX + slot / 2}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="8.5"
                  fill="#6b7263"
                >
                  {point.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function BuyerSparkline({ points }: { points: BuyerTrendPoint[] }) {
  if (points.length === 0) {
    return <span className="text-[0.66rem] text-ink-muted">لا توجد حملات</span>;
  }
  const width = 160;
  const height = 44;
  const pad = 3;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const max = Math.max(...points.map((point) => point.revenue), 1);
  const slot = innerW / points.length;
  const barW = Math.max(2, slot * 0.55);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-11 w-40"
      role="img"
      aria-label="اتجاه الإيراد"
    >
      {points.map((point, index) => {
        const h = point.revenue > 0 ? Math.max((point.revenue / max) * innerH, 1.5) : 0;
        return (
          <rect
            key={`${point.label}-${index}`}
            x={pad + index * slot + (slot - barW) / 2}
            y={pad + innerH - h}
            width={barW}
            height={h || 1}
            fill={h > 0 ? "#4a5a3c" : "#26311f"}
            fillOpacity={h > 0 ? 1 : 0.12}
            rx="1"
          >
            <title>{`${point.label} — ${formatPrice(point.revenue)}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}
