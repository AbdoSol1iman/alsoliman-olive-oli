import { formatPrice } from "@/lib/format";
import type { SalesPoint } from "@/lib/orders";

/**
 * Server-rendered revenue bar chart (last 14 days). Pure SVG — no chart
 * library, no client JS. RTL-safe: time flows left → right as on every
 * standard analytics axis.
 */
export function RevenueChart({ points }: { points: SalesPoint[] }) {
  const width = 720;
  const height = 220;
  const padX = 8;
  const padTop = 18;
  const padBottom = 26;
  const max = Math.max(...points.map((p) => p.revenue), 1);
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const slot = innerW / Math.max(points.length, 1);
  const barW = Math.max(slot * 0.55, 6);

  const ticks = [0, 0.5, 1].map((t) => ({
    y: padTop + innerH - innerH * t,
    value: Math.round(max * t),
  }));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[560px]"
        role="img"
        aria-label="مبيعات آخر 14 يومًا"
      >
        {ticks.map((t) => (
          <g key={t.value}>
            <line x1={padX} x2={width - padX} y1={t.y} y2={t.y} stroke="#26311f" strokeOpacity="0.12" strokeDasharray="3 4" />
            <text x={width - padX} y={t.y - 4} textAnchor="end" fontSize="9" fill="#6b7263">
              {t.value}
            </text>
          </g>
        ))}

        {points.map((p, i) => {
          const h = p.revenue > 0 ? Math.max((p.revenue / max) * innerH, 3) : 0;
          const x = padX + i * slot + (slot - barW) / 2;
          const y = padTop + innerH - h;
          return (
            <g key={p.date}>
              {h > 0 ? (
                <>
                  <rect x={x} y={y} width={barW} height={h} fill="#4a5a3c" rx="1.5" />
                  <rect x={x} y={y} width={barW} height={Math.min(h, 4)} fill="#C79A55" rx="1.5" />
                  <title>{`${p.label} — ${formatPrice(p.revenue, "ar")} (${p.orders})`}</title>
                </>
              ) : (
                <rect x={x} y={padTop + innerH - 2} width={barW} height={2} fill="#26311f" fillOpacity="0.12" />
              )}
              <text
                x={x + barW / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize="8.5"
                fill="#6b7263"
              >
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
